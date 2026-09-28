import { useEffect, useState } from 'react';
import { listDelegationsPoste, revoquerDelegationPoste } from '../api/delegationsPosteApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Alert } from '../../../shared/components/ui/Alert';

const ETATS = { active: 'Active', future: 'Planifiée', expiree: 'Expirée', revoquee: 'Révoquée' };

export function AdminDelegationsPostePage() {
  const [delegations, setDelegations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [selection, setSelection] = useState(null);
  const [motif, setMotif] = useState('');
  const [envoi, setEnvoi] = useState(false);

  async function charger() {
    setChargement(true);
    try {
      setDelegations(await listDelegationsPoste());
      setErreur('');
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'Impossible de charger les délégations.');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { charger(); }, []);

  async function confirmer(e) {
    e.preventDefault();
    if (!motif.trim() || !selection) return;
    setEnvoi(true);
    try {
      await revoquerDelegationPoste(selection.id, motif.trim());
      setSelection(null);
      setMotif('');
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'Révocation refusée.');
    } finally {
      setEnvoi(false);
    }
  }

  return <div className="space-y-6">
    <PageHeader title="Délégations de poste" description="Historique et révocation des délégations institutionnelles" />
    {erreur && <Alert variant="error">{erreur}</Alert>}
    <Card><CardBody>
      {chargement ? <p>Chargement…</p> : delegations.length === 0 ? <p>Aucune délégation.</p> :
        <div className="space-y-3">{delegations.map((delegation) => <div key={delegation.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <p className="font-medium">{delegation.poste} — {delegation.delegataire?.name ?? `Utilisateur #${delegation.delegataire_id}`}</p>
            <p className="text-sm text-slate-600">Du {delegation.debut?.slice(0, 10)} au {delegation.fin?.slice(0, 10)} · {ETATS[delegation.etat] ?? delegation.etat}</p>
            {delegation.etat === 'revoquee' && <p className="text-sm">Révoquée le {delegation.revoquee_at?.slice(0, 10)} par {delegation.revoquee_par?.name ?? `#${delegation.revoquee_par_id}`} — {delegation.motif_revocation}</p>}
          </div>
          {['active', 'future'].includes(delegation.etat) && <Button type="button" onClick={() => { setSelection(delegation); setMotif(''); }}>Révoquer</Button>}
        </div>)}</div>}
    </CardBody></Card>
    {selection && <Card><CardBody>
      <form onSubmit={confirmer} className="space-y-3">
        <p>Confirmer la révocation de la délégation {selection.poste} de {selection.delegataire?.name} ?</p>
        <label htmlFor="motif-revocation" className="block">Motif de révocation</label>
        <textarea id="motif-revocation" required maxLength={1000} value={motif} onChange={(e) => setMotif(e.target.value)} className="w-full rounded border p-2" />
        <div className="flex gap-2">
          <Button type="submit" disabled={envoi || !motif.trim()}>Confirmer la révocation</Button>
          <Button type="button" onClick={() => setSelection(null)}>Annuler</Button>
        </div>
      </form>
    </CardBody></Card>}
  </div>;
}
