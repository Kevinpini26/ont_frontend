import { useCallback, useEffect, useState } from 'react';
import { getDgAutorite, listDgInterims, updateDgDisponibilite } from '../api/dgDisponibiliteApi';
import { listAgentsCircuitCourrier } from '../api/agentsApi';
import { useAuthStore } from '../store/authStore';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';

export function DgInterimManagement() {
  const user = useAuthStore((state) => state.user);
  const gestionnaire = user?.poste === 'dg' || user?.role === 'administrateur';
  const [etat, setEtat] = useState(null);
  const [agents, setAgents] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [dgaId, setDgaId] = useState('');
  const [motif, setMotif] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const actualiser = useCallback(async () => {
    const [situation, liste, periodes] = await Promise.all([
      getDgAutorite(),
      gestionnaire ? listAgentsCircuitCourrier() : Promise.resolve([]),
      gestionnaire ? listDgInterims() : Promise.resolve([]),
    ]);
    setEtat(situation);
    setAgents(liste.filter((agent) => agent.poste === 'dga'));
    setHistorique(periodes);
  }, [gestionnaire]);

  useEffect(() => { actualiser().catch(() => setErreur('Impossible de charger l’intérim DG.')); }, [actualiser]);

  async function changer(disponible) {
    setEnCours(true);
    setErreur(null);
    try {
      await updateDgDisponibilite(disponible, disponible ? {} : {
        dga_interimaire_id: Number(dgaId), motif: motif.trim(),
      });
      setMotif('');
      await actualiser();
    } catch (error) {
      setErreur(error.response?.data?.message ?? 'Opération impossible.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Intérim institutionnel DG" description="Transfert temporaire de l’autorité DG pour le circuit courrier." />
      <CardBody className="space-y-4">
        {erreur && <Alert tone="error">{erreur}</Alert>}
        {etat?.interim ? (
          <div className="space-y-2 text-sm">
            <p>DGA intérimaire : <strong>{etat.interim.dga_interimaire?.name}</strong> · DG titulaire : {etat.interim.dg_titulaire?.name}</p>
            <p>Motif : {etat.interim.motif}</p>
            <p>Ouvert le {new Date(etat.interim.started_at).toLocaleString('fr-FR')} par {etat.interim.ouvert_par?.name}</p>
            {gestionnaire && <Button disabled={enCours} onClick={() => changer(true)}>Terminer l’intérim</Button>}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">Aucun intérim ouvert. Un ancien indicateur « DG indisponible » ne confère aucun pouvoir d’intérim.</p>
            {gestionnaire && <>
              <Field label="DGA intérimaire" htmlFor="dga-interimaire">
                <select id="dga-interimaire" className={inputClass} value={dgaId} onChange={(event) => setDgaId(event.target.value)}>
                  <option value="">Choisir le DGA…</option>
                  {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                </select>
              </Field>
              <Field label="Motif institutionnel" htmlFor="motif-interim">
                <textarea id="motif-interim" className={inputClass} maxLength={1000} value={motif} onChange={(event) => setMotif(event.target.value)} />
              </Field>
              <Button disabled={enCours || !dgaId || !motif.trim()} onClick={() => changer(false)}>Ouvrir l’intérim</Button>
            </>}
          </div>
        )}
        {gestionnaire && historique.length > 0 && <div className="border-t border-border pt-3">
          <h3 className="mb-2 font-medium">Historique des intérims</h3>
          <ol className="space-y-2 text-sm">
            {historique.map((periode) => <li key={periode.id}>
              {periode.dga_interimaire?.name} pour {periode.dg_titulaire?.name} — {periode.motif} ;
              du {new Date(periode.started_at).toLocaleString('fr-FR')} (par {periode.ouvert_par?.name})
              {periode.ended_at ? ` au ${new Date(periode.ended_at).toLocaleString('fr-FR')} (par ${periode.termine_par?.name})` : ' — en cours'}
            </li>)}
          </ol>
        </div>}
      </CardBody>
    </Card>
  );
}
