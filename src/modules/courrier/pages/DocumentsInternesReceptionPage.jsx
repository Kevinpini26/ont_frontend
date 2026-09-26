import { useEffect, useState } from 'react';
import { listDocumentsProduits, recevoirDocumentProduit } from '../api/courrierApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
export function DocumentsInternesReceptionPage() {
  const [documents, setDocuments] = useState(null); const charger = async () => setDocuments(await listDocumentsProduits()); useEffect(() => { charger(); }, []);
  if (!documents) return <LoadingBlock />;
  return <div><PageHeader title="Documents internes reçus" description="Documents validés par les directions et remis au circuit central." />{documents.length === 0 ? <EmptyState title="Aucun document en attente" /> : <div className="space-y-4">{documents.map((d) => <Card key={d.id}><CardBody className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{d.courrier?.objet}</p><p className="text-sm text-text-subtle">Référence {d.courrier?.reference_documentaire} · Dossier {d.courrier?.dossier_id} · Source #{d.document_source_id}</p></div><Button onClick={async () => { await recevoirDocumentProduit(d.id); await charger(); }}>Enregistrer et transmettre à SEC1</Button></CardBody></Card>)}</div>}</div>;
}
