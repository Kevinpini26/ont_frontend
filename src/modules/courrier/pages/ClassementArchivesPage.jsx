import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { archiverClassement, classerDispatch, corrigerClassement, listCentreDispatchPage, listClassementsDocuments } from '../api/courrierApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { Pagination } from '../../../shared/components/ui/Pagination';
import { Alert } from '../../../shared/components/ui/Alert';

export function ClassementArchivesPage() {
  const [donnees, setDonnees] = useState(null);
  const [saisie, setSaisie] = useState({});
  const [page, setPage] = useState(1);
  const [pageDispatch, setPageDispatch] = useState(1);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [dispatchs, classements] = await Promise.all([
        listCentreDispatchPage({ statut: 'en_attente', type: 'classement', page: pageDispatch }),
        listClassementsDocuments(page),
      ]);
      setDonnees({ dispatchs, classements });
    } catch (err) { setErreur(err.response?.data?.message ?? 'Chargement impossible.'); }
  }, [page, pageDispatch]);
  useEffect(() => { charger(); }, [charger]);
  async function executer(action) {
    setEnCours(true); setErreur(null);
    try { await action(); await charger(); }
    catch (err) { setErreur(err.response?.data?.message ?? 'Action impossible.'); }
    finally { setEnCours(false); }
  }
  const modifier = (cle, champ, valeur) => setSaisie((s) => ({ ...s, [cle]: { ...s[cle], [champ]: valeur } }));
  if (!donnees && !erreur) return <LoadingBlock />;
  return <div><PageHeader title="Classement & archives" description="Classement et archivage documentaire SEC2. L’archivage du dossier exige une décision distincte DG/DGA." />
    {erreur && <Alert tone="error">{erreur}</Alert>}
    {donnees && <div className="space-y-4">
      <h2 className="font-semibold">Classements à exécuter</h2>
      {donnees.dispatchs.data.map((d) => <Card key={d.id}><CardBody className="space-y-3">
        <Link to={`/courriers/${d.courrier_id}`}>{d.courrier?.objet} — réception et dossier</Link>
        <p>Décision : {d.instruction}</p>
        <div className="grid gap-2 md:grid-cols-2">
          <Field label="Cote (facultative)"><input className={inputClass} onChange={(e) => modifier(d.id, 'cote', e.target.value)} /></Field>
          <Field label="Emplacement" required><input className={inputClass} onChange={(e) => modifier(d.id, 'emplacement', e.target.value)} /></Field>
          <Field label="Observation (facultative)"><input className={inputClass} onChange={(e) => modifier(d.id, 'observation', e.target.value)} /></Field>
        </div>
        <Button disabled={enCours || !saisie[d.id]?.emplacement?.trim()} onClick={() => executer(() => classerDispatch(d.id, saisie[d.id]))}>Classer</Button>
      </CardBody></Card>)}
      <Pagination meta={donnees.dispatchs.meta} onPageChange={setPageDispatch} />
      <h2 className="font-semibold">Documents classés et archives</h2>
      {donnees.classements.data.map((c) => {
        const cle = `c-${c.id}`;
        const correction = saisie[cle] ?? {};
        return <Card key={cle}><CardBody className="space-y-3">
          <Link to={`/courriers/${c.courrier_id}`}>{c.courrier?.objet} — dossier et décision d’archivage</Link>
          <p>Cote {c.cote || 'non renseignée'} · {c.emplacement}</p>
          <Badge tone={c.statut === 'archive' ? 'success' : 'info'}>{c.statut}</Badge>
          {c.statut === 'classe' && <>
            <div className="grid gap-2 md:grid-cols-2">
              {['cote', 'emplacement', 'observation', 'motif'].map((champ) => <Field key={champ} label={champ === 'motif' ? 'Motif de correction' : champ} required={champ === 'motif'}>
                <input className={inputClass} onChange={(e) => modifier(cle, champ, e.target.value)} />
              </Field>)}
            </div>
            <div className="flex gap-2">
              <Button disabled={enCours || !correction.motif?.trim()} onClick={() => executer(() => corrigerClassement(c.id, correction))}>Corriger les métadonnées</Button>
              <Button disabled={enCours} onClick={() => executer(() => archiverClassement(c.id))}>Archiver le document</Button>
            </div>
          </>}
        </CardBody></Card>;
      })}
      <Pagination meta={donnees.classements} onPageChange={setPage} />
    </div>}
  </div>;
}
