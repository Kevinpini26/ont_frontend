import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { listStagiaires } from '../../stagiaires/api/stagiairesApi';
import { STATUT_LABELS, TYPE_STAGE_LABELS } from '../../stagiaires/constants';
import { SearchBar } from '../../../shared/components/SearchBar';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Badge } from '../../../shared/components/ui/Badge';
import { Pagination } from '../../../shared/components/ui/Pagination';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { TableWrap, tableClass, theadClass, thClass, tbodyClass, tdClass, trHoverClass } from '../../../shared/components/ui/Table';

const ONGLETS = [
  { cle: 'en_cours', libelle: 'En cours' },
  { cle: 'a_venir', libelle: 'À venir' },
  { cle: 'historique', libelle: 'Historique' },
];

export function DirectionStagiairesPage() {
  const [onglet, setOnglet] = useState('en_cours');
  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState('');
  const [typeStage, setTypeStage] = useState('');
  const [maitreStage, setMaitreStage] = useState('');
  const [page, setPage] = useState(1);
  const [stagiaires, setStagiaires] = useState([]);
  const [meta, setMeta] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    const params = { page };
    if (recherche) params.recherche = recherche;
    if (statut) params.statut = statut;
    if (typeStage) params.type_stage = typeStage;
    if (maitreStage) params.maitre_stage = maitreStage;
    if (onglet === 'en_cours') params.en_cours = 1;
    if (onglet === 'a_venir') params.a_venir = 1;
    if (onglet === 'historique') params.statut = 'cloture';

    listStagiaires(params)
      .then(({ data, meta: metaPage }) => {
        setStagiaires(data);
        setMeta(metaPage);
      })
      .finally(() => setChargement(false));
  }, [onglet, recherche, statut, typeStage, maitreStage, page]);

  useEffect(() => {
    setPage(1);
  }, [onglet, recherche, statut, typeStage, maitreStage]);

  return (
    <div>
      <PageHeader title="Stagiaires" description="Stagiaires accueillis par votre direction." />

      <div className="mb-4 flex flex-wrap gap-2">
        {ONGLETS.map((o) => (
          <Button key={o.cle} type="button" variant={onglet === o.cle ? 'primary' : 'secondary'} size="sm" onClick={() => setOnglet(o.cle)}>
            {o.libelle}
          </Button>
        ))}
      </div>

      <Card>
        <CardBody>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Recherche">
              <SearchBar value={recherche} onChange={setRecherche} placeholder="Nom ou numéro de dossier…" />
            </Field>
            <Field label="Statut" htmlFor="statut">
              <select id="statut" className={inputClass} value={statut} onChange={(e) => setStatut(e.target.value)}>
                <option value="">Tous</option>
                {Object.entries(STATUT_LABELS).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Type de stage" htmlFor="type_stage">
              <select id="type_stage" className={inputClass} value={typeStage} onChange={(e) => setTypeStage(e.target.value)}>
                <option value="">Tous</option>
                {Object.entries(TYPE_STAGE_LABELS).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Maître de stage" htmlFor="maitre_stage">
              <input
                id="maitre_stage"
                className={inputClass}
                value={maitreStage}
                onChange={(e) => setMaitreStage(e.target.value)}
                placeholder="Nom du maître de stage…"
              />
            </Field>
          </div>

          <p className="mb-4 text-sm text-text-subtle">
            {meta ? `${meta.total} résultat${meta.total > 1 ? 's' : ''}` : ''}
          </p>

          {chargement ? (
            <LoadingBlock />
          ) : stagiaires.length === 0 ? (
            <EmptyState icon={<GraduationCap size={32} />} title="Aucun stagiaire ne correspond" description="Ajustez les filtres ou la recherche ci-dessus." />
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Nom</th>
                    <th className={thClass}>Établissement</th>
                    <th className={thClass}>Statut</th>
                    <th className={thClass}>Début de stage</th>
                    <th className={thClass}>Fin de stage</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {stagiaires.map((s) => (
                    <tr key={s.id} className={trHoverClass}>
                      <td className={`${tdClass} whitespace-nowrap font-medium text-text`}>{s.nom}</td>
                      <td className={`${tdClass} max-w-[14rem] truncate`} title={s.etablissement_origine}>{s.etablissement_origine}</td>
                      <td className={tdClass}>
                        <Badge tone="info">{s.statut_label}</Badge>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>{s.date_debut_stage ?? '—'}</td>
                      <td className={`${tdClass} whitespace-nowrap`}>{s.date_fin_stage ?? '—'}</td>
                      <td className={tdClass}>
                        <Link to={`/stagiaires/${s.id}`}>
                          <Button type="button" variant="secondary" size="sm">
                            Ouvrir
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}

          <Pagination meta={meta} onPageChange={setPage} />
        </CardBody>
      </Card>
    </div>
  );
}
