import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
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
  if (statut === 403) return "Vous n’êtes pas autorisé à consulter ces documents.";
  if (statut === 404) return 'La liste demandée est introuvable.';
  return 'Impossible de charger les documents internes. Réessayez.';
}

function tonaliteStatut(statut) {
  if (statut === 'valide') return 'success';
  if (statut === 'a_corriger') return 'warning';
  if (statut === 'soumis_directeur') return 'info';
  return 'neutral';
}

export function DocumentsInternesDirectionPage() {
  const [page, setPage] = useState(1);
  const [reponse, setReponse] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async (signal) => {
    setChargement(true);
    setErreur(null);
    try {
      const resultat = await listDocumentsInternesAutonomes(page, signal);
      if (!signal.aborted) setReponse(resultat);
    } catch (err) {
      if (!signal.aborted && err.code !== 'ERR_CANCELED') {
        setReponse(null);
        setErreur(messageErreur(err));
      }
    } finally {
      if (!signal.aborted) setChargement(false);
    }
  }, [page]);

  useEffect(() => {
    const controleur = new AbortController();
    charger(controleur.signal);
    return () => controleur.abort();
  }, [charger]);

  const documents = (reponse?.data ?? []).filter((document) => document.origine === 'autonome');

  return (
    <div>
      <PageHeader
        title="Documents internes"
        description="Documents autonomes préparés et suivis par le secrétariat de votre direction."
        action={
          <Link
            to="/direction/documents-internes/nouveau"
            className="inline-flex items-center justify-center gap-1.5 rounded-field bg-ont-blue-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-ont-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ont-blue-500"
          >
            <Plus size={16} aria-hidden="true" />
            Créer un document
          </Link>
        }
      />

      {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}

      <Card>
        {chargement ? (
          <LoadingBlock label="Chargement des documents internes…" />
        ) : documents.length === 0 ? (
          <CardBody>
            <EmptyState
              title={erreur ? 'Documents indisponibles' : 'Aucun document interne'}
              description={erreur ? 'Réessayez lorsque le service sera disponible.' : 'Les documents autonomes créés par votre direction apparaîtront ici.'}
            />
          </CardBody>
        ) : (
          <>
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Objet</th>
                    <th className={thClass}>Statut</th>
                    <th className={thClass}>Créateur</th>
                    <th className={thClass}>Dernier éditeur</th>
                    <th className={thClass}>Dernière modification</th>
                    <th className={thClass}>Référence</th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {documents.map((document) => (
                    <tr key={document.id} className={trHoverClass}>
                      <td className={tdClassPremiere}>
                        <Link className="text-primary hover:underline" to={`/direction/documents-internes/${document.id}`}>
                          {document.courrier?.objet ?? 'Document sans objet'}
                        </Link>
                      </td>
                      <td className={tdClass}><Badge tone={tonaliteStatut(document.statut)}>{document.statut_label ?? document.statut}</Badge></td>
                      <td className={tdClass}>{document.tracabilite?.createur?.name ?? '—'}</td>
                      <td className={tdClass}>{document.tracabilite?.dernier_editeur?.name ?? '—'}</td>
                      <td className={tdClass}>{document.modifie_at ? formaterDateHeure(document.modifie_at) : '—'}</td>
                      <td className={tdClass}>{document.courrier?.reference_documentaire ?? '—'}</td>
                    </tr>
                  ))}
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
