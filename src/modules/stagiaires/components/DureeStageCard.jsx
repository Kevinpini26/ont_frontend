import { useState } from 'react';
import { modifierDatesStage, prolongerStage } from '../api/stagiairesApi';
import { ROLES } from '../../kernel/constants';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';

export function DureeStageCard({ stagiaire, user, executer }) {
  const estDfp = user.role === ROLES.AGENT_DFP;
  const estProfessionnel = stagiaire.type_stage === 'professionnel';
  const [edition, setEdition] = useState(false);
  const [nouvelleDateFin, setNouvelleDateFin] = useState(stagiaire.date_fin_stage ?? '');
  const [motif, setMotif] = useState('');
  const [dateDebutModif, setDateDebutModif] = useState(stagiaire.date_debut_stage ?? '');
  const [dateFinModif, setDateFinModif] = useState(stagiaire.date_fin_stage ?? '');
  const [envoi, setEnvoi] = useState(false);

  if (!stagiaire.date_debut_stage) return null;

  const peutProlonger = estDfp && estProfessionnel && stagiaire.statut === 'stage_en_cours';
  const peutModifier = estDfp && !estProfessionnel && ['stage_en_cours', 'evaluation_en_cours'].includes(stagiaire.statut);
  const historique = stagiaire.prolongations ?? [];

  if (!peutProlonger && !peutModifier && historique.length === 0) return null;

  async function soumettreProlongation(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await executer(() => prolongerStage(stagiaire.id, nouvelleDateFin, motif));
      setEdition(false);
      setMotif('');
    } catch {
      // erreur déjà affichée par `executer`
    } finally {
      setEnvoi(false);
    }
  }

  async function soumettreModification(e) {
    e.preventDefault();
    setEnvoi(true);
    try {
      await executer(() => modifierDatesStage(stagiaire.id, dateDebutModif, dateFinModif));
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
        title="Durée du stage"
        action={
          (peutProlonger || peutModifier) &&
          !edition && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setEdition(true)}>
              {peutProlonger ? 'Prolonger le stage' : 'Modifier les dates'}
            </Button>
          )
        }
      />
      <CardBody className="space-y-4">
        {edition && peutProlonger && (
          <form onSubmit={soumettreProlongation} className="space-y-3">
            <Field label="Nouvelle date de fin" htmlFor="nouvelle_date_fin">
              <input
                id="nouvelle_date_fin"
                type="date"
                className={inputClass}
                value={nouvelleDateFin}
                onChange={(e) => setNouvelleDateFin(e.target.value)}
                required
              />
            </Field>
            <Field label="Motif" htmlFor="motif_prolongation">
              <textarea
                id="motif_prolongation"
                rows={2}
                className={inputClass}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" size="sm" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Confirmer la prolongation'}
            </Button>
          </form>
        )}
        {edition && peutModifier && (
          <form onSubmit={soumettreModification} className="space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date de début" htmlFor="date_debut_modif">
                <input
                  id="date_debut_modif"
                  type="date"
                  className={inputClass}
                  value={dateDebutModif}
                  onChange={(e) => setDateDebutModif(e.target.value)}
                  required
                />
              </Field>
              <Field label="Date de fin" htmlFor="date_fin_modif">
                <input
                  id="date_fin_modif"
                  type="date"
                  className={inputClass}
                  value={dateFinModif}
                  onChange={(e) => setDateFinModif(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Button type="submit" size="sm" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </form>
        )}
        {!edition && (
          <p className="text-sm text-text-muted">
            {stagiaire.date_debut_stage} → {stagiaire.date_fin_stage}
          </p>
        )}
        {historique.length > 0 && (
          <div>
            <h4 className="mb-2 font-heading text-sm font-semibold text-text">Historique des prolongations</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              {historique.map((p, i) => (
                <li key={i} className="rounded-field bg-surface-sunken p-3">
                  <p>
                    {p.ancienne_date_fin} → <span className="font-medium">{p.nouvelle_date_fin}</span>
                  </p>
                  <p className="mt-1 text-xs text-text-subtle">
                    {p.prolonge_par ?? 'DFP'} — {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="mt-1 italic">« {p.motif} »</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
