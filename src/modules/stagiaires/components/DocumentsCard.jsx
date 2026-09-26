import { useEffect, useState } from 'react';
import { listDocuments, uploadDocument } from '../api/stagiairesApi';
import { estDirecteurDirection } from '../../kernel/constants';
import { DOCUMENT_TYPE_LABELS } from '../constants';
import { DocumentPreviewModal } from '../../../shared/components/DocumentPreviewModal';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { EmptyState } from '../../../shared/components/ui/EmptyState';

export function DocumentsCard({ stagiaire, user }) {
  const [documents, setDocuments] = useState([]);
  const [typeDocument, setTypeDocument] = useState(stagiaire.type_stage === 'professionnel' ? 'cv' : 'lettre_stage_universite');
  const [fichier, setFichier] = useState(null);
  const [envoiDocument, setEnvoiDocument] = useState(false);
  const [documentApercu, setDocumentApercu] = useState(null);

  const estDirectionAccueil = estDirecteurDirection(user);

  async function chargerDocuments() {
    setDocuments(await listDocuments(stagiaire.id));
  }

  useEffect(() => {
    chargerDocuments();
    // Le statut change au fil des actions DFP/direction (ex. l'attestation
    // est générée automatiquement à la clôture) : sans cette dépendance, la
    // liste des documents resterait périmée jusqu'au prochain rechargement
    // manuel de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagiaire.id, stagiaire.statut]);

  async function soumettreDocument(e) {
    e.preventDefault();
    if (!fichier) return;
    setEnvoiDocument(true);
    try {
      await uploadDocument(stagiaire.id, typeDocument, fichier);
      setFichier(null);
      await chargerDocuments();
    } finally {
      setEnvoiDocument(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Documents" />
      <CardBody>
        {estDirectionAccueil && (
          <form onSubmit={soumettreDocument} className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Type" htmlFor="type_document">
              <select id="type_document" className={inputClass} value={typeDocument} onChange={(e) => setTypeDocument(e.target.value)}>
                {stagiaire.type_stage === 'professionnel' ? (
                  <>
                    <option value="lettre_demande_stage">Lettre de demande de stage</option>
                    <option value="cv">CV du candidat</option>
                    <option value="diplome_etat">Diplôme d'État</option>
                    <option value="dernier_diplome">Dernier diplôme obtenu</option>
                  </>
                ) : (
                  <option value="lettre_stage_universite">Lettre de stage de l'université</option>
                )}
                <option value="piece_identite">Pièce d'identité</option>
                <option value="attestation_inscription">Attestation d'inscription</option>
              </select>
            </Field>
            <Field label="Fichier" htmlFor="fichier" hint="PDF, JPG ou PNG — 10 Mo max.">
              <input
                id="fichier"
                type="file"
                onChange={(e) => setFichier(e.target.files[0])}
                accept=".pdf,.jpg,.jpeg,.png"
                className="block w-full text-sm text-text-muted file:mr-3 file:rounded-field file:border-0 file:bg-ont-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ont-blue-700 hover:file:bg-ont-blue-100 dark:file:bg-ont-blue-950 dark:file:text-ont-blue-300"
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={!fichier || envoiDocument}>
                {envoiDocument ? 'Envoi…' : 'Téléverser'}
              </Button>
            </div>
          </form>
        )}

        {documents.length === 0 ? (
          <EmptyState title="Aucun document" />
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-text-muted">
                  {DOCUMENT_TYPE_LABELS[d.type]} — {d.nom_original}
                </span>
                <Button type="button" variant="secondary" size="sm" onClick={() => setDocumentApercu(d)}>
                  Voir le document
                </Button>
              </li>
            ))}
          </ul>
        )}
        <DocumentPreviewModal
          open={documentApercu !== null}
          onClose={() => setDocumentApercu(null)}
          title={documentApercu ? DOCUMENT_TYPE_LABELS[documentApercu.type] : ''}
          url={documentApercu ? `/stagiaires/${stagiaire.id}/documents/${documentApercu.id}/telecharger` : null}
          downloadFilename={documentApercu?.nom_original}
        />
      </CardBody>
    </Card>
  );
}
