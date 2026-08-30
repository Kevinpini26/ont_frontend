import { useState } from 'react';
import { importerHistoriqueStagiaires } from '../api/stagiairesApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';

const COLONNES_ATTENDUES = [
  'nom', 'contact', 'etablissement_origine', 'direction_code',
  'statut', 'date_debut_stage', 'date_fin_stage', 'note_finale', 'reference_courrier',
];

export function AdminImportHistoriquePage() {
  const [fichier, setFichier] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [rapport, setRapport] = useState(null);

  async function soumettre(e) {
    e.preventDefault();
    if (!fichier) return;
    setErreur(null);
    setRapport(null);
    setEnvoi(true);
    try {
      const resultat = await importerHistoriqueStagiaires(fichier);
      setRapport(resultat);
      setFichier(null);
      e.target.reset();
    } catch (err) {
      setErreur(err.response?.data?.message ?? "Échec de l'import.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Import d'historique des stagiaires"
        description="Charger des dossiers de stagiaires antérieurs au lancement du système, à partir d'un fichier CSV."
      />

      <Card className="mb-6">
        <CardHeader title="Format attendu" />
        <CardBody>
          <p className="mb-3 text-sm text-text-muted">
            La première ligne doit contenir exactement ces colonnes, dans cet ordre. Seules <strong>nom</strong> et{' '}
            <strong>etablissement_origine</strong> sont obligatoires ; les autres peuvent être laissées vides.
          </p>
          <code className="block overflow-x-auto rounded-field bg-surface-sunken px-3 py-2 text-xs text-text-muted">
            {COLONNES_ATTENDUES.join(',')}
          </code>
          <ul className="mt-3 list-inside list-disc text-sm text-text-muted">
            <li>direction_code doit correspondre au code d'une direction existante</li>
            <li>statut : dossier_recu, en_attente_affectation, affecte, stage_en_cours, evaluation_en_cours ou cloture (par défaut : cloture)</li>
            <li>dates au format AAAA-MM-JJ</li>
            <li>note_finale entre 0 et 20</li>
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Importer un fichier" />
        <CardBody>
          {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}

          <form onSubmit={soumettre} className="flex flex-wrap items-end gap-4">
            <Field label="Fichier CSV" htmlFor="fichier" hint="Colonnes conformes au format ci-dessus.">
              <input
                id="fichier"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFichier(e.target.files[0])}
                className="block w-full text-sm text-text-muted file:mr-3 file:rounded-field file:border-0 file:bg-ont-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ont-blue-700 hover:file:bg-ont-blue-100 dark:file:bg-ont-blue-950 dark:file:text-ont-blue-300"
              />
            </Field>
            <Button type="submit" disabled={!fichier || envoi}>
              {envoi ? 'Import en cours…' : 'Importer'}
            </Button>
          </form>
        </CardBody>
      </Card>

      {rapport && (
        <Card className="mt-6">
          <CardHeader title="Résultat de l'import" />
          <CardBody>
            <div className="mb-4 flex flex-wrap gap-3">
              <Badge tone="success">{rapport.importes} dossier(s) importé(s)</Badge>
              {rapport.rejetes.length > 0 && <Badge tone="danger">{rapport.rejetes.length} ligne(s) rejetée(s)</Badge>}
              <Badge tone="neutral">{rapport.total_lignes} ligne(s) analysée(s)</Badge>
            </div>

            {rapport.rejetes.length > 0 && (
              <ul className="divide-y divide-border text-sm">
                {rapport.rejetes.map((r) => (
                  <li key={r.ligne} className="py-2.5">
                    <span className="font-medium text-text-muted">Ligne {r.ligne} : </span>
                    <span className="text-text-muted">{r.raisons.join(' ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
