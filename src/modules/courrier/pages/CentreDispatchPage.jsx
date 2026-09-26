import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { executerDispatch, listCentreDispatch } from '../api/courrierApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

export function CentreDispatchPage() {
  const [dispatchs, setDispatchs] = useState(null);
  const [saisie, setSaisie] = useState({});
  const [enCours, setEnCours] = useState(false);
  const charger = async () => setDispatchs(await listCentreDispatch());
  useEffect(() => { charger(); }, []);

  async function executer(dispatch) {
    setEnCours(true);
    try { await executerDispatch(dispatch.id, saisie[dispatch.id]?.reference, saisie[dispatch.id]?.preuve); await charger(); }
    finally { setEnCours(false); }
  }
  if (!dispatchs) return <LoadingBlock />;

  return <div><PageHeader title="Centre de dispatch SEC2" description="Exécution fidèle des orientations décidées par la DG/DGA." />
    {dispatchs.length === 0 ? <EmptyState title="Aucun dispatch" /> : <div className="space-y-4">{dispatchs.map((dispatch) => <Card key={dispatch.id}><CardBody className="space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><div><Link className="font-semibold text-primary hover:underline" to={`/courriers/${dispatch.courrier_id}`}>{dispatch.courrier?.objet}</Link><p className="text-sm text-text-subtle">{dispatch.type_destination_label} — {dispatch.direction?.nom ?? dispatch.destinataire_externe_nom ?? 'Classement'}</p></div><Badge tone={dispatch.statut === 'execute' ? 'success' : 'warning'}>{dispatch.statut_label}</Badge></div>
      <p className="text-sm"><span className="font-medium">Instruction :</span> {dispatch.instruction}</p>
      {dispatch.statut === 'en_attente' && <div className="grid gap-3 md:grid-cols-2"><Field label="Référence de transmission"><input className={inputClass} value={saisie[dispatch.id]?.reference ?? ''} onChange={(e) => setSaisie((s) => ({ ...s, [dispatch.id]: { ...s[dispatch.id], reference: e.target.value } }))} /></Field><Field label="Preuve (PDF ou image)"><input type="file" accept="application/pdf,image/jpeg,image/png" className={inputClass} onChange={(e) => setSaisie((s) => ({ ...s, [dispatch.id]: { ...s[dispatch.id], preuve: e.target.files?.[0] } }))} /></Field><Button loading={enCours} disabled={dispatch.type_destination === 'exterieur' && !saisie[dispatch.id]?.reference && !saisie[dispatch.id]?.preuve} onClick={() => executer(dispatch)}>Marquer exécuté</Button></div>}
    </CardBody></Card>)}</div>}
  </div>;
}
