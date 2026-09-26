import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listMesMissions, prendreMissionEnCharge, retournerMission } from '../api/courrierApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

export function MissionsAssistantsPage() {
  const [missions, setMissions] = useState(null);
  const [retours, setRetours] = useState({});
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    setMissions(await listMesMissions());
  }

  useEffect(() => { charger(); }, []);

  async function executer(action) {
    setEnCours(true);
    try {
      await action();
      await charger();
    } finally {
      setEnCours(false);
    }
  }

  if (!missions) return <LoadingBlock />;

  return (
    <div>
      <PageHeader title="Mes missions documentaires" description="Travaux confiés par la DG ou la DGA autour d'un document existant." />
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
                {mission.compte_rendu && <p><span className="font-medium">Compte rendu :</span> {mission.compte_rendu}</p>}
                {mission.statut === 'assignee' && <Button disabled={enCours} onClick={() => executer(() => prendreMissionEnCharge(mission.id))}>Prendre en charge</Button>}
                {mission.statut === 'en_cours' && (
                  <div className="space-y-2">
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
