import { useEffect, useState } from 'react';
import { annulerMission, creerMission, demanderPreparationReponse, getCourrier, prendreMissionEnCharge, retournerMission } from '../api/courrierApi';
import { listAgentsCircuitCourrier } from '../../kernel/api/agentsApi';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Badge } from '../../../shared/components/ui/Badge';
import { formaterDateHeure } from '../utils/dateHeure';

const POSTES_ASSISTANTS = {
  dg: ['assistant_1', 'assistant_2'],
  dga: ['assistant_dga'],
};

export function MissionsDocumentairesPanel({ courrier, user, onUpdate, autoriserActions = true }) {
  const [agents, setAgents] = useState([]);
  const [assistantId, setAssistantId] = useState('');
  const [instruction, setInstruction] = useState('');
  const [compteRendu, setCompteRendu] = useState('');
  const [motif, setMotif] = useState('');
  const [enCours, setEnCours] = useState(false);
  const missions = courrier.missions_documentaires ?? [];
  const estAutorite = autoriserActions && (user.poste === 'dga' || (user.poste === 'dg' && user.source_autorite_dg))
    && ['en_attente_avis_dg', 'dispatch_execute'].includes(courrier.statut);

  useEffect(() => {
    if (estAutorite) listAgentsCircuitCourrier().then((liste) => setAgents(liste.filter((a) => POSTES_ASSISTANTS[user.poste].includes(a.poste))));
  }, [estAutorite, user.poste]);

  async function executer(action) {
    setEnCours(true);
    try {
      await action();
      onUpdate(await getCourrier(courrier.id));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Missions assistants" description="Sous-activités liées à ce même document, sans changement de courrier ni de dossier." />
      <CardBody className="space-y-4">
        {missions.length === 0 ? <p className="text-sm text-text-subtle">Aucune mission.</p> : (
          <ol className="space-y-3">
            {missions.map((mission) => (
              <li key={mission.id} className="rounded-field border border-border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{mission.assistant?.name}</strong>
                  <Badge tone={mission.statut === 'retournee' ? 'success' : mission.statut === 'annulee' ? 'neutral' : 'warning'}>{mission.statut_label}</Badge>
                </div>
                <p className="mt-2"><span className="font-medium">Instruction :</span> {mission.instruction}</p>
                <p className="text-text-subtle">Confiée par {mission.demandeur?.name}{formaterDateHeure(mission.envoyee_at) ? ` le ${formaterDateHeure(mission.envoyee_at)}` : ' · Date indisponible'}</p>
                {mission.compte_rendu && <p className="mt-2"><span className="font-medium">Retour :</span> {mission.compte_rendu}</p>}

                {autoriserActions && mission.assistant?.id === user.id && mission.statut === 'assignee' && (
                  <Button className="mt-3" size="sm" disabled={enCours} onClick={() => executer(() => prendreMissionEnCharge(mission.id))}>Prendre en charge</Button>
                )}
                {autoriserActions && mission.assistant?.id === user.id && mission.statut === 'en_cours' && (
                  <div className="mt-3 space-y-2">
                    <Field label="Compte rendu" htmlFor={`retour-${mission.id}`}>
                      <textarea id={`retour-${mission.id}`} className={inputClass} value={compteRendu} onChange={(e) => setCompteRendu(e.target.value)} />
                    </Field>
                    <Button size="sm" disabled={enCours || !compteRendu.trim()} onClick={() => executer(() => retournerMission(mission.id, compteRendu))}>Retourner à {mission.autorite_poste?.toUpperCase()}</Button>
                  </div>
                )}
                {estAutorite && ['assignee', 'en_cours'].includes(mission.statut) && mission.autorite_poste === user.poste && (
                  <div className="mt-3 flex gap-2">
                    <input className={inputClass} placeholder="Motif d'annulation" value={motif} onChange={(e) => setMotif(e.target.value)} />
                    <Button size="sm" variant="secondary" disabled={enCours || !motif.trim()} onClick={() => executer(() => annulerMission(mission.id, motif))}>Annuler</Button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        {estAutorite && !missions.some((m) => ['assignee', 'en_cours'].includes(m.statut) && m.autorite_poste === user.poste) && (
          <div className="space-y-3 border-t border-border pt-4">
            <Field label="Assistant" htmlFor="assistantMission" required>
              <select id="assistantMission" className={inputClass} value={assistantId} onChange={(e) => setAssistantId(e.target.value)}>
                <option value="">Choisir…</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
            </Field>
            <Field label="Instruction" htmlFor="instructionMission" required>
              <textarea id="instructionMission" className={inputClass} maxLength={5000} value={instruction} onChange={(e) => setInstruction(e.target.value)} />
            </Field>
            <Button
              disabled={enCours || !assistantId || !instruction.trim()}
              onClick={() => executer(() => user.poste === 'dg'
                ? demanderPreparationReponse(courrier.id, Number(assistantId), instruction)
                : creerMission(courrier.id, Number(assistantId), instruction))}
            >
              {user.poste === 'dg' ? 'Préparer une réponse' : 'Confier la mission'}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
