import { useState } from 'react';
import { definirInformationsComplementaires } from '../api/stagiairesApi';
import { ROLES } from '../../kernel/constants';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { EmptyState } from '../../../shared/components/ui/EmptyState';

const CHAMPS_INFORMATIONS_COMPLEMENTAIRES = [
  { cle: 'lieu_naissance', label: 'Lieu de naissance' },
  { cle: 'filiere_formation', label: 'Filière de formation' },
  { cle: 'niveau_formation', label: 'Niveau de formation' },
  { cle: 'maitre_stage', label: 'Maître de stage' },
  { cle: 'conseiller_stage', label: 'Conseiller de stage' },
];

export function InformationsComplementairesCard({ stagiaire, user, executer }) {
  const peutGerer = user.role === ROLES.AGENT_DFP;
  const [valeurs, setValeurs] = useState(
    Object.fromEntries(CHAMPS_INFORMATIONS_COMPLEMENTAIRES.map(({ cle }) => [cle, stagiaire[cle] ?? ''])),
  );
  const [edition, setEdition] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const renseignes = CHAMPS_INFORMATIONS_COMPLEMENTAIRES.filter(({ cle }) => stagiaire[cle]);

  if (!peutGerer && renseignes.length === 0) return null;

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await executer(() => definirInformationsComplementaires(stagiaire.id, valeurs));
      setEdition(false);
    } catch {
      // erreur déjà affichée par `executer`
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Informations complémentaires"
        action={
          peutGerer &&
          !edition && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setEdition(true)}>
              Modifier
            </Button>
          )
        }
      />
      <CardBody>
        {edition && peutGerer ? (
          <form onSubmit={soumettre} className="space-y-3">
            {CHAMPS_INFORMATIONS_COMPLEMENTAIRES.map(({ cle, label }) => (
              <Field key={cle} label={label} htmlFor={cle}>
                <input
                  id={cle}
                  className={inputClass}
                  value={valeurs[cle]}
                  onChange={(e) => setValeurs((v) => ({ ...v, [cle]: e.target.value }))}
                />
              </Field>
            ))}
            <Button type="submit" size="sm" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        ) : renseignes.length > 0 ? (
          <dl className="space-y-1 text-sm text-text-muted">
            {renseignes.map(({ cle, label }) => (
              <div key={cle}>
                <span className="font-medium text-text">{label} : </span>
                {stagiaire[cle]}
              </div>
            ))}
          </dl>
        ) : (
          <EmptyState title="Aucune information complémentaire renseignée pour le moment" />
        )}
      </CardBody>
    </Card>
  );
}
