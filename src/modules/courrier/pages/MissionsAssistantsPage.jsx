import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  creerProjetReponseMission,
  listMesMissions,
  prendreMissionEnCharge,
  retournerMission,
  sauvegarderProjetReponseMission,
  soumettreProjetReponseMission,
} from '../api/courrierApi';
import { TipTapEditor } from '../components/TipTapEditor';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { Alert } from '../../../shared/components/ui/Alert';

const contenuVide = { type: 'doc', content: [{ type: 'paragraph' }] };

function ProjetReponseMission({ mission, disabled, executer }) {
  const projet = mission.projet_courrier;
  const [objet, setObjet] = useState(projet?.objet ?? `Réponse à : ${mission.courrier?.objet ?? ''}`);
  const [destinataireNom, setDestinataireNom] = useState(projet?.destinataire_externe_nom ?? mission.courrier?.expediteur_externe_nom ?? '');
  const [destinataireEmail, setDestinataireEmail] = useState(projet?.destinataire_externe_email ?? mission.courrier?.expediteur_externe_email ?? '');
  const [contenu, setContenu] = useState(projet?.projet_reponse_contenu ?? contenuVide);

  if (mission.statut !== 'en_cours') return null;

  const payload = {
    objet,
    destinataire_externe_nom: destinataireNom,
    destinataire_externe_email: destinataireEmail || null,
    projet_reponse_contenu: contenu,
  };

  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      {projet?.projet_renvoi_observation && (
        <p className="rounded-field bg-warning-subtle p-3 text-sm text-warning-strong">
          Correction demandée : {projet.projet_renvoi_observation}
        </p>
      )}
      <Field label="Objet de la réponse" required>
        <input className={inputClass} value={objet} onChange={(event) => setObjet(event.target.value)} />
      </Field>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Destinataire institutionnel" required>
          <input className={inputClass} value={destinataireNom} onChange={(event) => setDestinataireNom(event.target.value)} />
        </Field>
        <Field label="E-mail du destinataire">
          <input type="email" className={inputClass} value={destinataireEmail} onChange={(event) => setDestinataireEmail(event.target.value)} />
        </Field>
      </div>
      <Field label="Projet de réponse" required>
        <TipTapEditor content={contenu} onChange={setContenu} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {!projet ? (
          <Button disabled={disabled || !objet.trim() || !destinataireNom.trim()} onClick={() => executer(() => creerProjetReponseMission(mission.id, payload), 'Le brouillon D a été créé.')}>
            Créer le brouillon D
          </Button>
        ) : projet.statut === 'projet_a_rediger' ? (
          <>
            <Button variant="secondary" disabled={disabled || !objet.trim() || !destinataireNom.trim()} onClick={() => executer(() => sauvegarderProjetReponseMission(mission.id, payload))}>
              Sauvegarder le brouillon
            </Button>
            <Button disabled={disabled || !objet.trim() || !destinataireNom.trim()} onClick={() => executer(async () => {
              await sauvegarderProjetReponseMission(mission.id, payload);
              await soumettreProjetReponseMission(mission.id, contenu);
            })}>
              Soumettre à la relecture
            </Button>
          </>
        ) : (
          <p className="text-sm text-text-subtle">Projet soumis au relecteur institutionnel.</p>
        )}
      </div>
    </div>
  );
}

export function MissionsAssistantsPage() {
  const [missions, setMissions] = useState(null);
  const [retours, setRetours] = useState({});
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(null);

  async function charger() {
    setMissions(await listMesMissions());
  }

  useEffect(() => {
    charger().catch((err) => {
      setErreur(err.response?.data?.message ?? 'Chargement des missions impossible.');
      setMissions([]);
    });
  }, []);

  async function executer(action, messageSucces = null) {
    setErreur(null);
    setSucces(null);
    setEnCours(true);
    try {
      await action();
      await charger();
      setSucces(messageSucces);
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'Action impossible.');
    } finally {
      setEnCours(false);
    }
  }

  if (!missions) return <LoadingBlock />;

  return (
    <div>
      <PageHeader title="Mes missions documentaires" description="Travaux confiés par la DG ou la DGA autour d'un document existant." />
      {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}
      {succes && <Alert tone="success" className="mb-4">{succes}</Alert>}
      {missions.length === 0 ? <EmptyState title="Aucune mission reçue" /> : (
        <div className="space-y-4">
          {missions.map((mission) => (
            <Card key={mission.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    {['assignee', 'en_cours'].includes(mission.statut) ? (
                      <Link className="font-semibold text-primary hover:underline" to={`/courriers/${mission.courrier_id}`}>{mission.courrier?.objet}</Link>
                    ) : <span className="font-semibold">{mission.courrier?.objet}</span>}
                    <p className="text-sm text-text-subtle">{mission.courrier?.numero_enregistrement} · {new Date(mission.envoyee_at).toLocaleString('fr-FR')}</p>
                  </div>
                  <Badge tone={mission.statut === 'retournee' ? 'success' : mission.statut === 'annulee' ? 'neutral' : 'warning'}>{mission.statut_label}</Badge>
                </div>
                <p><span className="font-medium">Instruction :</span> {mission.instruction}</p>
                {mission.type === 'preparation_reponse' && (
                  <p className="text-sm text-text-subtle">Projet officiel D — relecteur déterminé automatiquement lors de la soumission.</p>
                )}
                {mission.compte_rendu && <p><span className="font-medium">Compte rendu :</span> {mission.compte_rendu}</p>}
                {mission.statut === 'assignee' && <Button disabled={enCours} onClick={() => executer(() => prendreMissionEnCharge(mission.id))}>Prendre en charge</Button>}
                {mission.statut === 'en_cours' && (
                  mission.type === 'preparation_reponse' ? (
                    <ProjetReponseMission mission={mission} disabled={enCours} executer={executer} />
                  ) : <div className="space-y-2">
                    <Field label="Compte rendu" htmlFor={`compte-rendu-${mission.id}`} required>
                      <textarea id={`compte-rendu-${mission.id}`} className={inputClass} value={retours[mission.id] ?? ''} onChange={(e) => setRetours((r) => ({ ...r, [mission.id]: e.target.value }))} />
                    </Field>
                    <Button disabled={enCours || !(retours[mission.id] ?? '').trim()} onClick={() => executer(() => retournerMission(mission.id, retours[mission.id]))}>Retourner le travail</Button>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
