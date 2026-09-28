import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { archiverDossier, deciderArchivageDossier, getDossier, getRelationsDocumentaires } from '../api/courrierApi';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { Alert } from '../../../shared/components/ui/Alert';
import { Button } from '../../../shared/components/ui/Button';
import { useAuthStore } from '../../kernel/store/authStore';
import { useDgAutorite } from '../../kernel/hooks/useDgAutorite';
import { libelleReferenceDocument } from '../utils/receptionCourrier';

export function DossierDocumentsPanel({ courrier }) {
  const [dossier, setDossier] = useState(null);
  const [relations, setRelations] = useState([]);
  const [erreur, setErreur] = useState(null);
  const user = useAuthStore((state) => state.user);
  const sourceAutoriteDg = useDgAutorite();

  async function actualiserDossier(action) {
    try {
      await action();
      setDossier(await getDossier(courrier.dossier_id));
      setErreur(null);
    } catch (error) {
      setErreur(error.response?.data?.message || 'Cette opération est bloquée par une activité encore ouverte dans le dossier.');
    }
  }

  useEffect(() => {
    if (!courrier.dossier_id) return undefined;
    const controller = new AbortController();
    Promise.all([
      getDossier(courrier.dossier_id, controller.signal),
      getRelationsDocumentaires(courrier.id, controller.signal),
    ])
      .then(([dossierCharge, relationsChargees]) => {
        setDossier(dossierCharge);
        setRelations(relationsChargees);
      })
      .catch((error) => {
        if (error.code !== 'ERR_CANCELED') setErreur('Impossible de charger les documents associés.');
      });
    return () => controller.abort();
  }, [courrier.dossier_id, courrier.id]);

  if (!courrier.dossier_id) return null;

  return (
    <Card>
      <CardHeader title={`Dossier #${courrier.dossier_id}`} description="Regroupement documentaire" />
      <CardBody className="space-y-4">
        {erreur && <Alert tone="error">{erreur}</Alert>}
        {dossier && <div className="flex flex-wrap items-center gap-2"><Badge tone={dossier.statut_archivage === 'archive' ? 'success' : 'neutral'}>{dossier.statut_archivage}</Badge>{dossier.statut_archivage === 'actif' && sourceAutoriteDg && <Button onClick={() => actualiserDossier(() => deciderArchivageDossier(dossier.id))}>Décider l’archivage</Button>}{dossier.statut_archivage === 'a_archiver' && user?.poste === 'secretariat_2' && <Button onClick={() => actualiserDossier(() => archiverDossier(dossier.id))}>Archiver le dossier</Button>}</div>}
        {dossier?.documents?.length > 0 && (
          <div className="space-y-2">
            {dossier.documents.map((document) => (
              <div key={document.id} className="flex flex-wrap items-center justify-between gap-2 rounded-field border border-border p-3 text-sm">
                <div>
                  <Link className="font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-300" to={`/courriers/${document.id}`}>
                    {document.objet}
                  </Link>
                  <p className="text-text-muted">{libelleReferenceDocument(document)}</p>
                </div>
                <Badge tone={document.id === courrier.id ? 'info' : 'neutral'}>{document.statut_label}</Badge>
              </div>
            ))}
          </div>
        )}
        {relations.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-text">Relations documentaires</p>
            <ul className="space-y-1 text-sm text-text-muted">
              {relations.map((relation) => (
                <li key={relation.id}>
                  {relation.source.objet} — <strong>{relation.type_relation_label}</strong> — {relation.cible.objet}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
