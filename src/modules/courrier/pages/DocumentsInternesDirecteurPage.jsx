import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listDocumentsInternesAutonomes } from '../api/courrierApi';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Pagination } from '../../../shared/components/ui/Pagination';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { TableWrap, tableClass, tbodyClass, tdClass, tdClassPremiere, thClass, theadClass, trHoverClass } from '../../../shared/components/ui/Table';
import { formaterDateHeure } from '../utils/dateHeure';

function messageErreur(erreur) {
  const statut = erreur.response?.status;
  if (statut === 401) return 'Votre session a expiré. Connectez-vous à nouveau.';
  if (statut === 403) return 'Vous n’êtes pas autorisé à consulter ces documents.';
  if (statut === 404) return 'La liste demandée est introuvable.';
  return 'Impossible de charger les documents internes. Réessayez.';
}

function presentationStatut(document) {
  if (document.statut === 'soumis_directeur') return { label: 'À examiner', tone: 'info' };
  if (document.statut === 'a_corriger') return { label: 'Correction demandée', tone: 'warning' };
  if (document.statut === 'valide') return { label: 'Contenu validé', tone: 'success' };
  if (document.statut === 'brouillon' && document.soumis_at) return { label: 'Correction en préparation', tone: 'warning' };
  if (document.statut === 'brouillon') return { label: 'Brouillon — non soumis', tone: 'neutral' };
  return { label: document.statut_label ?? document.statut ?? 'Statut indisponible', tone: 'neutral' };
}

function datePertinente(document) {
  return document.valide_at ?? document.correction_demandee_at ?? document.soumis_at ?? document.modifie_at ?? document.cree_at;
}

export function DocumentsInternesDirecteurPage() {
  const [page, setPage] = useState(1);
  const [reponse, setReponse] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const generation = useRef(0);

  const charger = useCallback(async (signal) => {
    const requete = ++generation.current;
    setChargement(true);
    setErreur(null);
    try {
      const resultat = await listDocumentsInternesAutonomes(page, signal);
      if (generation.current === requete && !signal.aborted) setReponse(resultat);
    } catch (err) {
      if (generation.current === requete && !signal.aborted && err.code !== 'ERR_CANCELED') {
        setReponse(null);
        setErreur(messageErreur(err));
      }
    } finally {
      if (generation.current === requete && !signal.aborted) setChargement(false);
    }
  }, [page]);

  useEffect(() => {
    const controleur = new AbortController();
    charger(controleur.signal);
    return () => {
      generation.current += 1;
      controleur.abort();
    };
  }, [charger]);

  const documents = reponse?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Documents internes autonomes"
        description="Documents transmis pour décision ou dont une correction est en préparation."
      />
      {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}
      <Card>
        {chargement ? (
          <LoadingBlock label="Chargement des documents internes…" />
        ) : documents.length === 0 ? (
          <CardBody>
            <EmptyState
              title={erreur ? 'Documents indisponibles' : 'Aucun document interne'}
              description={erreur ? 'Réessayez lorsque le service sera disponible.' : 'Aucun document autonome visible ne figure sur cette page.'}
            />
          </CardBody>
        ) : (
          <>
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Objet</th>
                    <th className={thClass}>Direction productrice</th>
                    <th className={thClass}>Statut</th>
                    <th className={thClass}>Date pertinente</th>
                    <th className={thClass}>Référence</th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {documents.map((document) => {
                    const statut = presentationStatut(document);
                    return (
                      <tr key={document.id} className={trHoverClass}>
                        <td className={tdClassPremiere}>
                          <Link className="text-primary hover:underline" to={`/direction/directeur/documents-internes/${document.id}`}>
                            {document.courrier?.objet ?? 'Document sans objet'}
                          </Link>
                        </td>
                        <td className={tdClass}>{document.courrier?.direction_origine?.nom ?? 'Direction indisponible'}</td>
                        <td className={tdClass}><Badge tone={statut.tone}>{statut.label}</Badge></td>
                        <td className={tdClass}>{formaterDateHeure(datePertinente(document)) ?? '—'}</td>
                        <td className={tdClass}>{document.courrier?.reference_documentaire ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
            <CardBody className="border-t border-border pt-0">
              <Pagination meta={reponse?.meta} onPageChange={setPage} />
            </CardBody>
          </>
        )}
      </Card>
    </div>
  );
}
