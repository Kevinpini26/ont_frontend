import { useEffect, useRef, useState } from 'react';
import {
  accepterDocumentAutonomeReception,
  demanderCorrectionDocumentAutonomeReception,
  getEtatControleReception,
  listDocumentsAutonomesTransmisReception,
  listDocumentsProduits,
  recevoirDocumentProduit,
} from '../api/courrierApi';
import { ScanOfficielPanel } from '../components/ScanOfficielPanel';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Modal } from '../../../shared/components/ui/Modal';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { formaterDateHeure } from '../utils/dateHeure';

const PREFIXE_DECISION_INCERTAINE = 'ont:reception-decision:';

function lireDecisionsIncertaines() {
  try {
    return Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
      .filter((key) => key?.startsWith(PREFIXE_DECISION_INCERTAINE))
      .map((key) => key.slice(PREFIXE_DECISION_INCERTAINE.length));
  } catch {
    return [];
  }
}

function texteContenu(contenu) {
  if (!contenu || typeof contenu !== 'object') return '';
  if (contenu.type === 'text' && typeof contenu.text === 'string') return contenu.text;
  if (!Array.isArray(contenu.content)) return '';
  return contenu.content.map(texteContenu).filter(Boolean).join(' ');
}

function estResultatAcceptation(document) {
  return document?.statut === 'entre_circuit'
    && Boolean(document?.courrier?.numero_enregistrement)
    && Boolean(document?.recu_at);
}

export function DocumentsInternesReceptionPage() {
  const [documentsHistoriques, setDocumentsHistoriques] = useState(null);
  const [documentsTransmis, setDocumentsTransmis] = useState(null);
  const [pageAutonomes, setPageAutonomes] = useState(1);
  const [chargementHistoriques, setChargementHistoriques] = useState(true);
  const [chargementAutonomes, setChargementAutonomes] = useState(true);
  const [erreurHistoriques, setErreurHistoriques] = useState('');
  const [erreurAutonomes, setErreurAutonomes] = useState('');
  const [receptionEnCours, setReceptionEnCours] = useState(null);
  const [decisionEnCours, setDecisionEnCours] = useState(null);
  const [decisionsIncertaines, setDecisionsIncertaines] = useState(() => lireDecisionsIncertaines());
  const [decisionAConfirmer, setDecisionAConfirmer] = useState(null);
  const [documentACorriger, setDocumentACorriger] = useState(null);
  const [motifCorrection, setMotifCorrection] = useState('');
  const [erreurDecision, setErreurDecision] = useState('');
  const [verificationEnCours, setVerificationEnCours] = useState(null);
  const [resultatDecision, setResultatDecision] = useState(null);
  const decisionVerrou = useRef(false);

  async function actualiserAutonomes(page = pageAutonomes) {
    setErreurAutonomes('');
    setChargementAutonomes(true);
    try {
      const resultat = await listDocumentsAutonomesTransmisReception(page);
      setDocumentsTransmis(resultat);
      return resultat;
    } catch {
      setErreurAutonomes('La file des documents autonomes transmis ne peut pas être chargée.');
      return null;
    } finally {
      setChargementAutonomes(false);
    }
  }

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

  function retirerDecisionIncertaine(id) {
    try {
      sessionStorage.removeItem(`${PREFIXE_DECISION_INCERTAINE}${id}`);
    } catch {
      setErreurDecision('Le navigateur ne permet pas de mettre à jour l’état local de vérification.');
      return false;
    }
    setDecisionsIncertaines((ids) => ids.filter((incertainId) => String(incertainId) !== String(id)));
    return true;
  }

  async function verifierDecision(id) {
    if (verificationEnCours !== null) return;
    setVerificationEnCours(id);
    setErreurDecision('');
    try {
      const resultat = await getEtatControleReception(id);
      if (estResultatAcceptation(resultat)) {
        retirerDecisionIncertaine(id);
        setDocumentsTransmis((courant) => courant && ({
          ...courant,
          data: courant.data.filter((document) => String(document.id) !== String(id)),
        }));
        setResultatDecision({ type: 'acceptee', document: resultat });
      } else if (resultat.statut === 'a_corriger') {
        retirerDecisionIncertaine(id);
        setDocumentsTransmis((courant) => courant && ({
          ...courant,
          data: courant.data.filter((document) => String(document.id) !== String(id)),
        }));
        setResultatDecision({ type: 'correction', document: resultat });
      } else if (resultat.statut === 'transmis_reception') {
        if (retirerDecisionIncertaine(id)) {
          setResultatDecision({ type: 'attente', document: resultat });
        }
      } else {
        setErreurDecision('Le serveur a renvoyé un état qui ne permet pas de confirmer la décision.');
      }
    } catch {
      setErreurDecision('La décision ne peut pas encore être vérifiée. Aucun nouvel envoi n’a été effectué.');
    } finally {
      setVerificationEnCours(null);
    }
  }

  async function executerDecision(type, document, motif = '') {
    if (decisionVerrou.current || !document) return;
    decisionVerrou.current = true;
    setDecisionEnCours(document.id);
    setErreurDecision('');
    setResultatDecision(null);

    try {
      sessionStorage.setItem(`${PREFIXE_DECISION_INCERTAINE}${document.id}`, 'pending');
      setDecisionsIncertaines((ids) => ids.includes(String(document.id)) ? ids : [...ids, String(document.id)]);
    } catch {
      setErreurDecision('Le stockage de session est indisponible. La décision n’a pas été envoyée.');
      decisionVerrou.current = false;
      setDecisionEnCours(null);
      return;
    }

    try {
      const resultat = type === 'acceptee'
        ? await accepterDocumentAutonomeReception(document.id)
        : await demanderCorrectionDocumentAutonomeReception(document.id, motif);
      const resultatValide = type === 'acceptee'
        ? estResultatAcceptation(resultat)
        : resultat?.statut === 'a_corriger' && resultat?.motif_correction === motif.trim();
      if (!resultatValide) throw new Error('Réponse de décision incomplète');

      retirerDecisionIncertaine(document.id);
      setDocumentsTransmis((courant) => courant && ({
        ...courant,
        data: courant.data.filter((element) => String(element.id) !== String(document.id)),
      }));
      setResultatDecision({ type, document: resultat });
      setDecisionAConfirmer(null);
      setDocumentACorriger(null);
      setMotifCorrection('');
      await actualiserAutonomes();
    } catch (erreur) {
      const statut = erreur.response?.status;
      const resultatIncertain = !statut || statut === 409 || statut >= 500;
      if (!resultatIncertain) retirerDecisionIncertaine(document.id);
      setErreurDecision(resultatIncertain
        ? 'Le résultat de cette décision est incertain. Vérifiez son état avant toute nouvelle décision ; aucun renvoi automatique n’a été effectué.'
        : statut === 422
          ? 'La demande est invalide. Vérifiez le motif et l’état du document.'
          : statut === 403
            ? 'Cette action est réservée à un agent habilité de la Réception.'
            : 'La décision n’a pas pu être enregistrée.');
    } finally {
      decisionVerrou.current = false;
      setDecisionEnCours(null);
    }
  }

  const documentsAutonomes = documentsTransmis?.data ?? [];
  const documentSelectionne = decisionAConfirmer
    ? documentsAutonomes.find((document) => String(document.id) === String(decisionAConfirmer))
    : null;

  return (
    <div className="space-y-8">
      <PageHeader title="Documents internes reçus" description="Files distinctes pour les documents historiques et les documents autonomes transmis par leur direction." />

      <section aria-labelledby="autonomes-transmis-titre" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="autonomes-transmis-titre" className="font-heading text-section-title font-semibold">Documents transmis par les directions</h2>
            <p className="mt-1 text-sm text-text-muted">Contrôlez la référence, la provenance, la destination et le scan officiel avant d’accepter ou de demander une correction.</p>
          </div>
          <Button variant="secondary" disabled={chargementAutonomes} loading={chargementAutonomes} onClick={() => actualiserAutonomes()}>Actualiser la file</Button>
        </div>
        {erreurAutonomes && <Alert tone="error">{erreurAutonomes}</Alert>}
        {erreurDecision && <Alert tone="error">{erreurDecision}</Alert>}
        {resultatDecision?.type === 'acceptee' && (
          <Alert tone="success">
            Document accepté et orienté vers SEC1. Numéro d’enregistrement : <strong>{resultatDecision.document.courrier.numero_enregistrement}</strong>.
            La prise en charge par SEC1 n’est pas simulée.
          </Alert>
        )}
        {resultatDecision?.type === 'correction' && (
          <Alert tone="info">
            Correction demandée. Le document a quitté la file d’attente et le secrétariat producteur peut reprendre le parcours de correction.
          </Alert>
        )}
        {resultatDecision?.type === 'attente' && (
          <Alert tone="info">Le document est toujours en attente de contrôle. La vérification est terminée; une nouvelle décision peut être effectuée explicitement.</Alert>
        )}
        {decisionsIncertaines.length > 0 && (
          <div className="space-y-2">
            {decisionsIncertaines.map((id) => (
              <Alert key={id} tone="error">
                Décision au résultat incertain pour le document #{id}. Vérifiez son état avant toute nouvelle action.
                <Button className="ml-3 mt-2" variant="secondary" disabled={verificationEnCours !== null} loading={verificationEnCours === id} onClick={() => verifierDecision(id)}>
                  Vérifier la décision
                </Button>
              </Alert>
            ))}
          </div>
        )}
        {chargementAutonomes ? <LoadingBlock label="Chargement des documents transmis…" /> : documentsAutonomes.length === 0 ? (
          <EmptyState title="Aucun document transmis par les directions" />
        ) : (
          <>
            <div className="space-y-4">
              {documentsAutonomes.map((document) => {
                const décisionIncertaine = decisionsIncertaines.includes(String(document.id));
                const enCours = decisionEnCours !== null;
                return (
                  <Card key={document.id}>
                    <CardHeader
                      title={document.courrier?.objet ?? 'Document sans objet'}
                      description={`Référence officielle : ${document.courrier?.reference_documentaire ?? 'Indisponible'}`}
                    />
                    <CardBody className="space-y-4">
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <p>Direction productrice : <strong>{document.courrier?.direction_origine?.nom ?? document.direction?.nom ?? 'Indisponible'}</strong></p>
                        <p>Destination souhaitée : <strong>{document.direction_destination_souhaitee?.nom ?? 'Non précisée'}</strong></p>
                        <p>Directeur désigné : {document.directeur?.name ?? '—'}</p>
                        <p>Validé le : {formaterDateHeure(document.valide_at) ?? '—'}</p>
                        <p>Transmis le : {formaterDateHeure(document.transmis_reception_at) ?? '—'}</p>
                        <p>Transmis par : {document.transmis_reception_par?.name ?? '—'}</p>
                        <p><Badge tone="info">En attente de contrôle par la Réception</Badge></p>
                      </div>
                      {texteContenu(document.courrier?.contenu) && (
                        <details className="rounded-field border border-border p-3">
                          <summary className="cursor-pointer text-sm font-medium">Consulter le contenu textuel</summary>
                          <p className="mt-3 whitespace-pre-wrap text-sm">{texteContenu(document.courrier.contenu)}</p>
                          <p className="mt-2 text-xs text-text-muted">Le scan signé et cacheté demeure la pièce officielle de référence.</p>
                        </details>
                      )}
                      <ScanOfficielPanel key={`scan-${document.id}`} document={document} modeReception onUpdated={() => {}} />
                      {décisionIncertaine && <Alert tone="error">Le résultat d’une décision précédente est incertain. Vérifiez-le avant de continuer.</Alert>}
                      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                        <Button
                          disabled={enCours || décisionIncertaine}
                          loading={decisionEnCours === document.id}
                          onClick={() => setDecisionAConfirmer(document.id)}
                        >
                          Accepter
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={enCours || décisionIncertaine}
                          onClick={() => { setDocumentACorriger(document); setMotifCorrection(''); }}
                        >
                          Demander une correction
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
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

      <ConfirmDialog
        open={Boolean(documentSelectionne)}
        title="Accepter le document ?"
        description={documentSelectionne
          ? `Le document « ${documentSelectionne.courrier?.objet ?? 'sans objet'} » recevra un numéro d’enregistrement et sera orienté vers SEC1. La prise en charge par SEC1 ne sera pas simulée.`
          : ''}
        confirmLabel="Confirmer l’acceptation"
        pending={decisionEnCours !== null}
        onConfirm={() => executerDecision('acceptee', documentSelectionne)}
        onCancel={() => { if (!decisionVerrou.current) setDecisionAConfirmer(null); }}
      />

      <Modal
        open={Boolean(documentACorriger)}
        title="Demander une correction"
        onClose={() => { if (!decisionVerrou.current) setDocumentACorriger(null); }}
        footer={(
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={decisionEnCours !== null} onClick={() => setDocumentACorriger(null)}>Annuler</Button>
            <Button
              type="button"
              variant="primary"
              disabled={decisionEnCours !== null || motifCorrection.trim().length < 5}
              loading={decisionEnCours === documentACorriger?.id}
              onClick={() => executerDecision('correction', documentACorriger, motifCorrection)}
            >
              Envoyer la demande
            </Button>
          </div>
        )}
      >
        <p className="mb-4 text-sm text-text-muted">
          {documentACorriger?.courrier?.reference_documentaire && `Document ${documentACorriger.courrier.reference_documentaire}. `}
          Le document quittera la file de contrôle. Toute modification du contenu officiel devra repasser par une validation du Directeur et un nouveau scan signé.
        </p>
        <Field label="Motif de la correction" htmlFor="motif-correction-reception" required hint="Décrivez précisément les corrections attendues (5 caractères minimum).">
          <textarea
            id="motif-correction-reception"
            className={inputClass}
            rows={5}
            maxLength={5000}
            value={motifCorrection}
            onChange={(event) => setMotifCorrection(event.target.value)}
            disabled={decisionEnCours !== null}
          />
        </Field>
      </Modal>
    </div>
  );
}
