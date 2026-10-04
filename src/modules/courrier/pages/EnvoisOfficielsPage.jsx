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
    listCourriers({ file_sorties_sec2: true, page }, controleur.signal)
      .then(setDonnees).catch((err) => { if (!controleur.signal.aborted) setErreur(err.response?.data?.message ?? 'Chargement des envois impossible.'); });
    return () => controleur.abort();
  }, [page]);
  return <div><PageHeader title="Sorties officielles SEC2" description="Canaux de remise à exécuter et retraits physiques à confirmer." />
    {erreur && <Alert tone="error">{erreur}</Alert>}
    {!donnees ? <LoadingBlock /> : <><ul className="space-y-3">{donnees.data.map((courrier) => <li key={courrier.id}><Link to={`/courriers/${courrier.id}`}>{courrier.numero_depart} — {courrier.objet}</Link></li>)}</ul><Pagination meta={donnees.meta} onPageChange={setPage} /></>}
  </div>;
}
