import { useCallback, useEffect, useState } from 'react';
import { archiverDossier, listDossiersAArchiver } from '../api/courrierApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Pagination } from '../../../shared/components/ui/Pagination';
import { Alert } from '../../../shared/components/ui/Alert';
import { Button } from '../../../shared/components/ui/Button';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

export function ArchivageDossiersPage() {
  const [page, setPage] = useState(1);
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const charger = useCallback(async () => {
    try { setDonnees(await listDossiersAArchiver(page)); }
    catch (err) { setErreur(err.response?.data?.message ?? 'Chargement impossible.'); }
  }, [page]);
  useEffect(() => { charger(); }, [charger]);
  async function archiver(id) {
    setEnCours(true); setErreur(null);
    try { await archiverDossier(id); await charger(); }
    catch (err) { setErreur(err.response?.data?.message ?? 'Archivage bloqué.'); }
    finally { setEnCours(false); }
  }
  return <div><PageHeader title="Archivage des dossiers" description="Exécuter exclusivement les décisions DG/DGA déjà prises. Tous les blockers restent contrôlés." />
    {erreur && <Alert tone="error">{erreur}</Alert>}
    {!donnees && !erreur ? <LoadingBlock /> : donnees && <><ul className="space-y-4">{donnees.data.map((dossier) => <li key={dossier.id} className="flex items-center justify-between gap-3"><span>Dossier #{dossier.id} — {dossier.libelle}</span><Button disabled={enCours} onClick={() => archiver(dossier.id)}>Archiver le dossier</Button></li>)}</ul><Pagination meta={donnees} onPageChange={setPage} /></>}
  </div>;
}
