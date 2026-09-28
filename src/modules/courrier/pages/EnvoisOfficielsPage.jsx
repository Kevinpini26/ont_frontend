import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCourriers } from '../api/courrierApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Pagination } from '../../../shared/components/ui/Pagination';
import { Alert } from '../../../shared/components/ui/Alert';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

export function EnvoisOfficielsPage() {
  const [page, setPage] = useState(1);
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  useEffect(() => {
    const controleur = new AbortController();
    listCourriers({ statut: 'signe', sens: 'sortant', page }, controleur.signal)
      .then(setDonnees).catch((err) => { if (!controleur.signal.aborted) setErreur(err.response?.data?.message ?? 'Chargement des envois impossible.'); });
    return () => controleur.abort();
  }, [page]);
  return <div><PageHeader title="Envois officiels" description="Courriers sortants signés à réceptionner puis envoyer par SEC2." />
    {erreur && <Alert tone="error">{erreur}</Alert>}
    {!donnees ? <LoadingBlock /> : <><ul className="space-y-3">{donnees.data.map((courrier) => <li key={courrier.id}><Link to={`/courriers/${courrier.id}`}>{courrier.numero_depart} — {courrier.objet}</Link></li>)}</ul><Pagination meta={donnees.meta} onPageChange={setPage} /></>}
  </div>;
}
