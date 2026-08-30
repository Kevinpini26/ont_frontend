import { useState } from 'react';
import { evaluerDirection, terminerStage } from '../api/stagiairesApi';
import { GrilleEvaluationForm, grilleVide } from './GrilleEvaluationForm';
import { GrilleEvaluationProfessionnelleForm, grilleProVide } from './GrilleEvaluationProfessionnelleForm';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Alert } from '../../../shared/components/ui/Alert';

export function ActionsDirection({ stagiaire, executer }) {
  const estProfessionnel = stagiaire.type_stage === 'professionnel';
  const [grille, setGrille] = useState(() => (estProfessionnel ? grilleProVide() : grilleVide()));
  const [envoi, setEnvoi] = useState(false);

  if (stagiaire.statut === 'stage_en_cours') {
    return (
      <Card>
        <CardBody>
          <Button onClick={() => executer(() => terminerStage(stagiaire.id))}>Terminer le stage (passer en évaluation)</Button>
        </CardBody>
      </Card>
    );
  }

  if (stagiaire.evaluation_direction_soumise) {
    return (
      <Card>
        <CardBody>
          <Alert tone="success">
            Évaluation soumise. Le résultat final (moyenne avec l'évaluation de la DFP) n'est visible que par la DFP.
          </Alert>
        </CardBody>
      </Card>
    );
  }

  if (stagiaire.statut === 'evaluation_en_cours') {
    if (!stagiaire.periode_evaluation_ouverte) {
      return (
        <Card>
          <CardBody>
            <Alert tone="info">L'évaluation sera disponible une fois activée par la DFP.</Alert>
          </CardBody>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader title="Évaluation du travail effectué" description="Grille officielle ONT." />
        <CardBody className="space-y-4">
          {stagiaire.objectifs?.length > 0 && (
            <div className="rounded-field bg-surface-sunken p-3 text-xs text-text-muted">
              <p className="mb-1 font-medium">Objectifs fixés au démarrage — notez le travail au regard de ceux-ci :</p>
              <ul className="list-disc pl-4">
                {stagiaire.objectifs.map((o, i) => (
                  <li key={i}>{o}</li>
                ))}
              </ul>
            </div>
          )}
          {estProfessionnel ? (
            <GrilleEvaluationProfessionnelleForm valeurs={grille} onChange={setGrille} suggestionAssiduite={stagiaire.assiduite_suggestion} />
          ) : (
            <GrilleEvaluationForm valeurs={grille} onChange={setGrille} suggestionAssiduite={stagiaire.assiduite_suggestion} />
          )}
          <Button disabled={envoi} onClick={async () => {
            setEnvoi(true);
            try {
              await executer(() => evaluerDirection(stagiaire.id, grille));
            } catch {
              // erreur déjà affichée par `executer`
            } finally {
              setEnvoi(false);
            }
          }}>
            {envoi ? 'Envoi…' : "Valider l'évaluation"}
          </Button>
        </CardBody>
      </Card>
    );
  }

  return null;
}
