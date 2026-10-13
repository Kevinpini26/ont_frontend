import { useEffect, useState } from 'react';
import { listDocumentsAutonomesTransmisReception, listDocumentsProduits, recevoirDocumentProduit } from '../api/courrierApi';
import { ScanOfficielPanel } from '../components/ScanOfficielPanel';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { formaterDateHeure } from '../utils/dateHeure';

export function DocumentsInternesReceptionPage() {
  const [documentsHistoriques, setDocumentsHistoriques] = useState(null);
  const [documentsTransmis, setDocumentsTransmis] = useState(null);
  const [pageAutonomes, setPageAutonomes] = useState(1);
  const [chargementHistoriques, setChargementHistoriques] = useState(true);
  const [chargementAutonomes, setChargementAutonomes] = useState(true);
  const [erreurHistoriques, setErreurHistoriques] = useState('');
  const [erreurAutonomes, setErreurAutonomes] = useState('');
  const [receptionEnCours, setReceptionEnCours] = useState(null);

  useEffect(() => {
    let actif = true;
    const controleur = new AbortController();

    setChargementHistoriques(true);
    setErreurHistoriques('');
    listDocumentsProduits()
      .then((documents) => { if (actif) setDocumentsHistoriques(documents); })
      .catch(() => { if (actif) setErreurHistoriques('La file historique des documents internes ne peut pas être chargée.'); })
      .finally(() => { if (actif) setChargementHistoriques(false); });

    setChargementAutonomes(true);
    setErreurAutonomes('');
    listDocumentsAutonomesTransmisReception(pageAutonomes, controleur.signal)
      .then((resultat) => { if (actif) setDocumentsTransmis(resultat); })
      .catch((erreur) => {
        if (actif && erreur.name !== 'CanceledError' && erreur.name !== 'AbortError') {
          setErreurAutonomes('La file des documents autonomes transmis ne peut pas être chargée.');
        }
      })
      .finally(() => { if (actif) setChargementAutonomes(false); });

    return () => {
      actif = false;
      controleur.abort();
    };
  }, [pageAutonomes]);

  async function actualiserHistoriques() {
    setErreurHistoriques('');
    try {
      setDocumentsHistoriques(await listDocumentsProduits());
    } catch {
      setErreurHistoriques('La file historique des documents internes ne peut pas être actualisée.');
    }
  }

  async function recevoirDocument(id) {
    if (receptionEnCours !== null) return;
    setReceptionEnCours(id);
    setErreurHistoriques('');
    try {
      await recevoirDocumentProduit(id);
      await actualiserHistoriques();
    } catch {
      setErreurHistoriques('Le document historique n’a pas pu être enregistré dans le circuit central.');
    } finally {
      setReceptionEnCours(null);
    }
  }

  const documentsAutonomes = documentsTransmis?.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title="Documents internes reçus" description="Files distinctes pour les documents historiques et les documents autonomes transmis par leur direction." />

      <section aria-labelledby="autonomes-transmis-titre" className="space-y-4">
        <div>
          <h2 id="autonomes-transmis-titre" className="font-heading text-section-title font-semibold">Documents transmis par les directions</h2>
          <p className="mt-1 text-sm text-text-muted">Documents autonomes dont le scan officiel signé et cacheté a été transmis à la Réception. Cette étape ne les accepte pas et ne leur attribue aucun numéro d’enregistrement.</p>
        </div>
        {erreurAutonomes && <Alert tone="error">{erreurAutonomes}</Alert>}
        {chargementAutonomes ? <LoadingBlock label="Chargement des documents transmis…" /> : documentsAutonomes.length === 0 ? (
          <EmptyState title="Aucun document transmis par les directions" />
        ) : (
          <>
            <div className="space-y-4">
              {documentsAutonomes.map((document) => (
                <Card key={document.id}>
                  <CardHeader
                    title={document.courrier?.objet ?? 'Document sans objet'}
                    description={`Direction productrice : ${document.courrier?.direction_origine?.nom ?? 'Indisponible'}`}
                  />
                  <CardBody className="space-y-4">
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p>Référence documentaire : <strong>{document.courrier?.reference_documentaire ?? 'Indisponible'}</strong></p>
                      <p>Validé le : {formaterDateHeure(document.valide_at) ?? '—'}</p>
                      <p>Transmis le : {formaterDateHeure(document.transmis_reception_at) ?? '—'}</p>
                      <p>Transmis par : {document.transmis_reception_par?.name ?? '—'}</p>
                      <p><Badge tone="info">En attente de traitement par la Réception</Badge></p>
                    </div>
                    <ScanOfficielPanel key={`scan-${document.id}`} document={document} modeReception onUpdated={() => {}} />
                  </CardBody>
                </Card>
              ))}
            </div>
            {documentsTransmis?.meta?.last_page > 1 && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-text-muted">Page {documentsTransmis.meta.current_page} sur {documentsTransmis.meta.last_page}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={pageAutonomes <= 1} onClick={() => setPageAutonomes((page) => page - 1)}>Précédent</Button>
                  <Button variant="secondary" disabled={pageAutonomes >= documentsTransmis.meta.last_page} onClick={() => setPageAutonomes((page) => page + 1)}>Suivant</Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="historiques-reception-titre" className="space-y-4">
        <div>
          <h2 id="historiques-reception-titre" className="font-heading text-section-title font-semibold">Documents internes du circuit historique</h2>
          <p className="mt-1 text-sm text-text-muted">Le circuit historique reste inchangé.</p>
        </div>
        {erreurHistoriques && <Alert tone="error">{erreurHistoriques}</Alert>}
        {chargementHistoriques ? <LoadingBlock /> : documentsHistoriques?.length === 0 ? (
          <EmptyState title="Aucun document historique en attente" />
        ) : (
          <div className="space-y-4">
            {documentsHistoriques?.map((document) => (
              <Card key={document.id}>
                <CardBody className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-semibold">{document.courrier?.objet}</p>
                    <p className="text-sm text-text-subtle">Référence {document.courrier?.reference_documentaire} · Dossier {document.courrier?.dossier_id} · Source #{document.document_source_id}</p>
                  </div>
                  <Button disabled={receptionEnCours !== null} loading={receptionEnCours === document.id} onClick={() => recevoirDocument(document.id)}>Enregistrer et transmettre à SEC1</Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
