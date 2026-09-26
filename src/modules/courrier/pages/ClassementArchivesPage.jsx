import { useEffect, useState } from 'react';
import { archiverClassement, classerDispatch, corrigerClassement, listCentreDispatch, listClassementsDocuments } from '../api/courrierApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { Pagination } from '../../../shared/components/ui/Pagination';

export function ClassementArchivesPage() {
  const [donnees, setDonnees] = useState(null);
  const [saisie, setSaisie] = useState({});
  const [page, setPage] = useState(1);

  async function charger(pageDemandee = page) {
    const [dispatchs, classements] = await Promise.all([listCentreDispatch({ statut: 'en_attente' }), listClassementsDocuments(pageDemandee)]);
    setDonnees({ dispatchs: dispatchs.filter((d) => d.type_destination === 'classement'), classements });
  }

  useEffect(() => { charger(page); }, [page]);
  if (!donnees) return <LoadingBlock />;

  return <div><PageHeader title="Classement & archives" description="Exécution SEC2 des décisions institutionnelles de classement." /><div className="space-y-4">
    {donnees.dispatchs.map((d) => <Card key={`d-${d.id}`}><CardBody className="space-y-2"><p className="font-semibold">{d.courrier?.objet}</p><p className="text-sm">Décision : {d.instruction}</p><div className="grid gap-2 md:grid-cols-2"><Field label="Cote (facultative)"><input className={inputClass} onChange={(e) => setSaisie((s) => ({ ...s, [d.id]: { ...s[d.id], cote: e.target.value } }))} /></Field><Field label="Emplacement" required><input className={inputClass} onChange={(e) => setSaisie((s) => ({ ...s, [d.id]: { ...s[d.id], emplacement: e.target.value } }))} /></Field></div><Button disabled={!saisie[d.id]?.emplacement} onClick={async () => { await classerDispatch(d.id, saisie[d.id]); await charger(); }}>Classer</Button></CardBody></Card>)}
    {donnees.classements.data.map((c) => { const correction = saisie[`c-${c.id}`] ?? {}; return <Card key={`c-${c.id}`}><CardBody className="space-y-3"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{c.courrier?.objet}</p><p className="text-sm text-text-subtle">Cote {c.cote || 'non renseignée'} · {c.emplacement}</p></div><Badge tone={c.statut === 'archive' ? 'success' : 'info'}>{c.statut}</Badge></div><div className="grid gap-2 md:grid-cols-2"><Field label="Nouvelle cote"><input className={inputClass} onChange={(e) => setSaisie((s) => ({ ...s, [`c-${c.id}`]: { ...correction, cote: e.target.value } }))} /></Field><Field label="Nouvel emplacement"><input className={inputClass} onChange={(e) => setSaisie((s) => ({ ...s, [`c-${c.id}`]: { ...correction, emplacement: e.target.value } }))} /></Field><Field label="Observation"><input className={inputClass} onChange={(e) => setSaisie((s) => ({ ...s, [`c-${c.id}`]: { ...correction, observation: e.target.value } }))} /></Field><Field label="Motif de correction" required><input className={inputClass} onChange={(e) => setSaisie((s) => ({ ...s, [`c-${c.id}`]: { ...correction, motif: e.target.value } }))} /></Field></div><div className="flex gap-2"><Button disabled={!correction.motif} onClick={async () => { await corrigerClassement(c.id, correction); await charger(); }}>Corriger les métadonnées</Button>{c.statut === 'classe' && <Button onClick={async () => { await archiverClassement(c.id); await charger(); }}>Archiver</Button>}</div></CardBody></Card>; })}
    <Pagination meta={donnees.classements} onPageChange={setPage} />
  </div></div>;
}
