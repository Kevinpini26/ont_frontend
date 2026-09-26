import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { accuserReceptionDispatch, listBoiteDispatchDirection, transmettreTraitementDirecteur } from '../api/courrierApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

export function BoiteDispatchDirectionPage() {
  const [dispatchs, setDispatchs] = useState(null);
  const [notes, setNotes] = useState({});
  const charger = async () => setDispatchs(await listBoiteDispatchDirection());
  useEffect(() => { charger(); }, []);
  if (!dispatchs) return <LoadingBlock />;
  return <div><PageHeader title="Courriers reçus par la direction" description="Dispatchs internes transmis par le Secrétariat 02." />
    {dispatchs.length === 0 ? <EmptyState title="Aucun courrier dispatché" /> : <div className="space-y-4">{dispatchs.map((dispatch) => <Card key={dispatch.id}><CardBody className="space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link className="font-semibold text-primary hover:underline" to={`/courriers/${dispatch.courrier_id}`}>{dispatch.courrier?.objet}</Link><p className="text-sm text-text-subtle">{dispatch.courrier?.numero_enregistrement} · Provenance SEC2</p><p className="mt-2 text-sm">{dispatch.instruction}</p></div>{dispatch.accuse_reception_at ? <Badge tone="success">{dispatch.traitement_direction?.statut_label ?? 'Réception confirmée'}</Badge> : <Button onClick={async () => { await accuserReceptionDispatch(dispatch.id); await charger(); }}>Confirmer la réception</Button>}</div>{dispatch.traitement_direction?.statut === 'recu_secretariat' && <div className="flex flex-wrap items-end gap-2"><label className="min-w-64 flex-1 text-sm">Note au Directeur<input className="mt-1 w-full rounded-field border border-border bg-surface px-3 py-2" value={notes[dispatch.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [dispatch.id]: e.target.value }))} /></label><Button onClick={async () => { await transmettreTraitementDirecteur(dispatch.traitement_direction.id, notes[dispatch.id]); await charger(); }}>Transmettre au Directeur</Button></div>}</CardBody></Card>)}</div>}
  </div>;
}
