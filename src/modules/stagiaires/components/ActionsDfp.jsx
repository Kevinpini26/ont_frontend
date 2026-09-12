import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  evaluerDfp,
  examinerDossier,
  ouvrirPeriodeEvaluation,
  reaffecter,
  validerArrivee,
} from '../api/stagiairesApi';
import { listDirections } from '../../kernel/api/directionsApi';
import { GrilleEvaluationForm, SECTIONS_GRILLE, grilleVide } from './GrilleEvaluationForm';
import { GrilleEvaluationProfessionnelleForm, SECTIONS_GRILLE_PRO, grilleProVide } from './GrilleEvaluationProfessionnelleForm';
import { TableauResultatEvaluation } from './TableauResultatEvaluation';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';

const STATUTS_REAFFECTABLES = ['affecte', 'stage_en_cours', 'evaluation_en_cours'];

const STATUTS_OUVERTURE_EVALUATION = ['stage_en_cours', 'evaluation_en_cours'];

export function ActionsDfp({ stagiaire, executer }) {
  const [directions, setDirections] = useState([]);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const estProfessionnel = stagiaire.type_stage === 'professionnel';
  const [grille, setGrille] = useState(() => (estProfessionnel ? grilleProVide() : grilleVide()));
  const [envoi, setEnvoi] = useState(false);
  const [envoiOuverture, setEnvoiOuverture] = useState(false);

  const peutReaffecter = STATUTS_REAFFECTABLES.includes(stagiaire.statut);
  const [reaffectDirectionId, setReaffectDirectionId] = useState('');
  const [reaffectJustification, setReaffectJustification] = useState('');
  const [reaffectQuotaAtteint, setReaffectQuotaAtteint] = useState(false);
  const [reaffectEnvoi, setReaffectEnvoi] = useState(false);

  useEffect(() => {
    if (peutReaffecter) {
      listDirections().then((dirs) => setDirections(dirs.filter((d) => d.actif)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagiaire.statut]);

  async function tenterReaffecter(forcer = false) {
    setReaffectEnvoi(true);
    try {
      await executer(() => reaffecter(stagiaire.id, Number(reaffectDirectionId), { forcer, justification: reaffectJustification }));
      setReaffectQuotaAtteint(false);
      setReaffectDirectionId('');
      setReaffectJustification('');
    } catch (err) {
      if (err.response?.data?.quota_atteint) {
        setReaffectQuotaAtteint(true);
      }
    } finally {
      setReaffectEnvoi(false);
    }
  }

  const carteReaffectation = peutReaffecter && (
    <Card>
      <CardHeader
        title="Réaffecter à une autre direction"
        description="Changement de direction d'accueil en cours de stage — justification obligatoire, tracée dans le journal d'audit."
      />
      <CardBody className="space-y-4">
        <Field label="Nouvelle direction d'accueil" htmlFor="reaffect_direction_id">
          <select
            id="reaffect_direction_id"
            className={inputClass}
            value={reaffectDirectionId}
            onChange={(e) => setReaffectDirectionId(e.target.value)}
          >
            <option value="" disabled>
              Choisir une direction
            </option>
            {directions
              .filter((d) => d.id !== stagiaire.direction?.id)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.nom}
                  {d.capacite_max !== null ? ` (capacité ${d.capacite_max})` : ''}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Justification" htmlFor="reaffect_justification" required>
          <textarea
            id="reaffect_justification"
            rows={2}
            className={inputClass}
            value={reaffectJustification}
            onChange={(e) => setReaffectJustification(e.target.value)}
          />
        </Field>
        {reaffectQuotaAtteint && (
          <Alert tone="error">
            Cette direction a atteint sa capacité maximale de stagiaires. Vous pouvez néanmoins procéder, la dérogation est conservée
            dans le journal d'audit.
          </Alert>
        )}
        <Button
          type="button"
          variant={reaffectQuotaAtteint ? 'gold' : 'primary'}
          disabled={!reaffectDirectionId || !reaffectJustification.trim() || reaffectEnvoi}
          onClick={() => tenterReaffecter(reaffectQuotaAtteint)}
        >
          {reaffectQuotaAtteint ? 'Réaffecter malgré le quota' : 'Réaffecter'}
        </Button>
      </CardBody>
    </Card>
  );

  const cartePeriodeEvaluation = !stagiaire.periode_evaluation_ouverte
    && STATUTS_OUVERTURE_EVALUATION.includes(stagiaire.statut) && (
    <Card>
      <CardHeader
        title="Période d'évaluation"
        description="Tant que non activée, la direction n'a pas accès à son formulaire d'évaluation."
      />
      <CardBody>
        <Button
          type="button"
          disabled={envoiOuverture}
          onClick={async () => {
            setEnvoiOuverture(true);
            try {
              await executer(() => ouvrirPeriodeEvaluation(stagiaire.id));
            } catch {
              // erreur déjà affichée par `executer`
            } finally {
              setEnvoiOuverture(false);
            }
          }}
        >
          {envoiOuverture ? 'Activation…' : "Ouvrir la période d'évaluation"}
        </Button>
      </CardBody>
    </Card>
  );

  if (stagiaire.statut === 'dossier_recu') {
    return (
      <Card>
        <CardBody>
          <Button onClick={() => executer(() => examinerDossier(stagiaire.id))}>Examiner le dossier</Button>
        </CardBody>
      </Card>
    );
  }

  if (stagiaire.statut === 'en_attente_affectation') {
    return (
      <Card>
        <CardHeader title="En attente d'affectation" />
        <CardBody>
          <p className="text-sm text-text-muted">
            Ce dossier est éligible à un tableau de répartition — l'affectation se décide désormais en y sélectionnant ce dossier, plus
            depuis cette fiche.
          </p>
          <Link to="/tableaux-repartition" className="mt-3 inline-block text-sm font-medium text-ont-blue-700 underline">
            Aller aux tableaux de répartition
          </Link>
        </CardBody>
      </Card>
    );
  }

  if (stagiaire.statut === 'en_instruction') {
    return (
      <Card>
        <CardHeader title="En instruction" />
        <CardBody>
          <p className="text-sm text-text-muted">
            Ce dossier figure dans un tableau de répartition en cours — l'issue (retenu ou non retenu) ne devient effective qu'à
            l'approbation du tableau par la DG. Aucune information n'est transmise au candidat avant cette approbation.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (stagiaire.statut === 'non_retenu') {
    return (
      <Card>
        <CardHeader title="Dossier non retenu" />
        <CardBody className="space-y-2 text-sm text-text-muted">
          <p>
            <span className="font-medium text-text">Motif : </span>
            {stagiaire.motif_non_retenu_label}
          </p>
          {stagiaire.motif_non_retenu_libre && <p>{stagiaire.motif_non_retenu_libre}</p>}
          <p className="text-xs text-text-subtle">Le candidat a été notifié — voir l'historique des notifications ci-contre.</p>
        </CardBody>
      </Card>
    );
  }

  if (stagiaire.statut === 'affecte') {
    return (
      <>
        <Card>
          <CardHeader title="Valider l'arrivée" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date de début" htmlFor="date_debut">
                <input id="date_debut" type="date" className={inputClass} value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
              </Field>
              {estProfessionnel ? (
                <div className="flex items-end">
                  <p className="text-xs text-text-subtle">
                    Durée fixée à 3 mois à compter de la date de début. Une prolongation sera possible ensuite.
                  </p>
                </div>
              ) : (
                <Field label="Date de fin prévue" htmlFor="date_fin">
                  <input id="date_fin" type="date" className={inputClass} value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
                </Field>
              )}
            </div>
            <p className="text-xs text-text-subtle">
              La convention de stage sera générée automatiquement et un lien de signature envoyé au stagiaire.
            </p>
            <Button
              disabled={!dateDebut || (!estProfessionnel && !dateFin)}
              onClick={() => executer(() => validerArrivee(stagiaire.id, dateDebut, estProfessionnel ? undefined : dateFin))}
            >
              Valider l'arrivée
            </Button>
          </CardBody>
        </Card>
        <div className="mt-6 space-y-6">{cartePeriodeEvaluation}{carteReaffectation}</div>
      </>
    );
  }

  if (stagiaire.statut === 'evaluation_en_cours' && !stagiaire.evaluation_dfp_soumise) {
    return (
      <>
      <Card>
        <CardHeader title="Évaluation DFP" description="Grille officielle ONT — indépendante de celle de la direction." />
        <CardBody className="space-y-4">
          {stagiaire.objectifs?.length > 0 && (
            <div className="rounded-field bg-surface-sunken p-3 text-xs text-text-muted">
              <p className="mb-1 font-medium">Objectifs fixés au démarrage :</p>
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
              await executer(() => evaluerDfp(stagiaire.id, grille));
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
      <div className="mt-6 space-y-6">{cartePeriodeEvaluation}{carteReaffectation}</div>
      </>
    );
  }

  if (stagiaire.evaluation_direction_soumise && stagiaire.evaluation_dfp_soumise && stagiaire.evaluation) {
    return (
      <>
        <Card>
          <CardHeader
            title="Résultat de l'évaluation"
            description="Détail complet des deux évaluations — visible par la DFP uniquement, imprimable pour retranscription sur la fiche physique."
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  document.getElementById('zone-impression-evaluation')?.classList.add('zone-impression');
                  window.print();
                  document.getElementById('zone-impression-evaluation')?.classList.remove('zone-impression');
                }}
              >
                Imprimer
              </Button>
            }
          />
          <CardBody>
            <div id="zone-impression-evaluation">
              <TableauResultatEvaluation
                sections={estProfessionnel ? SECTIONS_GRILLE_PRO : SECTIONS_GRILLE}
                grilleDirection={stagiaire.evaluation.direction.grille}
                grilleDfp={stagiaire.evaluation.dfp.grille}
                totalDirection={stagiaire.evaluation.direction.total}
                totalDfp={stagiaire.evaluation.dfp.total}
                noteFinale={stagiaire.evaluation.note_finale}
              />
            </div>
          </CardBody>
        </Card>
        <div className="mt-6 space-y-6">{cartePeriodeEvaluation}{carteReaffectation}</div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {cartePeriodeEvaluation}
      {carteReaffectation}
    </div>
  );
}
