import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { listStagiaires } from '../api/stagiairesApi';
import { listDirections } from '../../kernel/api/directionsApi';
import { useRequete } from '../../../shared/hooks/useRequete';
import { STATUT_LABELS, TYPE_STAGE_LABELS } from '../constants';
import { SearchBar } from '../../../shared/components/SearchBar';
import { ExportButtons } from '../../../shared/components/ExportButtons';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Pagination } from '../../../shared/components/ui/Pagination';
import {
  TableWrap,
  tableClass,
  theadClass,
  thClass,
  thClassChiffre,
  tbodyClass,
  tdClass,
  tdClassPremiere,
  tdClassChiffre,
  trHoverClass,
  SkeletonRows,
} from '../../../shared/components/ui/Table';

const ONGLETS = [
  { cle: 'en_cours', libelle: 'En cours' },
  { cle: 'a_venir', libelle: 'À venir' },
  { cle: 'echeance', libelle: "Proches de l'échéance" },
];

export function DfpStagiairesPage() {
  // Lecture unique au montage (pas de synchronisation continue avec l'URL) :
  // sert seulement à arriver depuis le tableau de bord sur un filtre déjà
  // posé (voir StatCard "to" dans DfpDashboardPage), pas à piloter l'état
  // du filtre depuis l'URL en continu.
  const [searchParams] = useSearchParams();
  const [onglet, setOnglet] = useState(() => searchParams.get('onglet') ?? 'en_cours');
  const [directions, setDirections] = useState([]);
  const [directionId, setDirectionId] = useState('');
  const [statut, setStatut] = useState(() => searchParams.get('statut') ?? '');
  const [typeStage, setTypeStage] = useState('');
  const [maitreStage, setMaitreStage] = useState('');
  const [conseillerStage, setConseillerStage] = useState('');
  const [etablissement, setEtablissement] = useState('');
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    listDirections().then(setDirections);
  }, []);

  const { donnees: reponse, chargement } = useRequete(
    (signal) => {
      const params = { page };
      if (directionId) params.direction_id = directionId;
      if (statut) params.statut = statut;
      if (typeStage) params.type_stage = typeStage;
      if (maitreStage) params.maitre_stage = maitreStage;
      if (conseillerStage) params.conseiller_stage = conseillerStage;
      if (etablissement) params.etablissement_origine = etablissement;
      if (recherche) params.recherche = recherche;
      if (onglet === 'en_cours') params.en_cours = 1;
      if (onglet === 'a_venir') params.a_venir = 1;
      if (onglet === 'echeance') params.echeance_proche = 1;

      return listStagiaires(params, signal);
    },
    [onglet, directionId, statut, typeStage, maitreStage, conseillerStage, etablissement, recherche, page],
  );
  const stagiaires = reponse?.data ?? [];
  const meta = reponse?.meta ?? null;

  useEffect(() => {
    setPage(1);
  }, [onglet, directionId, statut, typeStage, maitreStage, conseillerStage, etablissement, recherche]);

  return (
    <div>
      <PageHeader title="Stagiaires" description="Stagiaires accueillis à l'ONT, toutes directions confondues." />

      <div className="mb-4 flex flex-wrap gap-2">
        {ONGLETS.map((o) => (
          <Button key={o.cle} type="button" variant={onglet === o.cle ? 'primary' : 'secondary'} size="sm" onClick={() => setOnglet(o.cle)}>
            {o.libelle}
          </Button>
        ))}
        {/* Archives déjà couvertes par sa propre page dédiée (recherche +
            filtres avancés, année par année) — pas de duplication ici. */}
        <Link to="/stagiaires/historique">
          <Button type="button" variant="secondary" size="sm">
            Historique
          </Button>
        </Link>
      </div>

      <Card>
        <CardBody>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Recherche">
              <SearchBar value={recherche} onChange={setRecherche} placeholder="Nom ou numéro de dossier…" />
            </Field>
            <Field label="Direction" htmlFor="direction">
              <select id="direction" className={inputClass} value={directionId} onChange={(e) => setDirectionId(e.target.value)}>
                <option value="">Toutes</option>
                {directions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code}
                  </option>
                ))}
              </select>
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
            <Field label="Établissement" htmlFor="etablissement">
              <input
                id="etablissement"
                className={inputClass}
                value={etablissement}
                onChange={(e) => setEtablissement(e.target.value)}
                placeholder="Établissement d'origine…"
              />
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
            <Field label="Conseiller de stage" htmlFor="conseiller_stage">
              <input
                id="conseiller_stage"
                className={inputClass}
                value={conseillerStage}
                onChange={(e) => setConseillerStage(e.target.value)}
                placeholder="Nom du conseiller de stage…"
              />
            </Field>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-text-subtle">
              {meta ? `${meta.total} résultat${meta.total > 1 ? 's' : ''}` : ''}
            </p>
            <ExportButtons
              data={stagiaires}
              filename="stagiaires-ont"
              columns={[
                { label: 'Nom', value: (s) => s.nom },
                { label: 'Type de stage', value: (s) => s.type_stage_label ?? '' },
                { label: 'Établissement', value: (s) => s.etablissement_origine },
                { label: 'Direction', value: (s) => s.direction?.code ?? '' },
                { label: 'Statut', value: (s) => s.statut_label },
                { label: 'Fin de stage', value: (s) => s.date_fin_stage ?? '' },
                { label: 'Jours restants', value: (s) => s.jours_restants ?? '' },
              ]}
            />
          </div>

          {!chargement && stagiaires.length === 0 ? (
            <EmptyState
              icon={<GraduationCap size={32} />}
              title="Aucun stagiaire ne correspond"
              description="Ajustez les filtres ou la recherche ci-dessus."
            />
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Nom</th>
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Établissement</th>
                    <th className={thClass}>Direction</th>
                    <th className={thClass}>Statut</th>
                    <th className={thClassChiffre}>Fin de stage</th>
                    <th className={thClassChiffre}>Jours restants</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargement ? (
                    <SkeletonRows colonnes={8} />
                  ) : (
                    stagiaires.map((s) => (
                      <tr key={s.id} className={trHoverClass}>
                        <td className={`${tdClassPremiere} whitespace-nowrap`}>{s.nom}</td>
                        <td className={tdClass}>
                          <Badge tone="neutral">{s.type_stage_label}</Badge>
                        </td>
                        <td className={`${tdClass} max-w-[14rem] truncate`} title={s.etablissement_origine}>{s.etablissement_origine}</td>
                        <td className={tdClass}>{s.direction?.code ?? '—'}</td>
                        <td className={tdClass}>
                          <Badge tone="info">{s.statut_label}</Badge>
                        </td>
                        <td className={`${tdClassChiffre} whitespace-nowrap`}>{s.date_fin_stage ?? '—'}</td>
                        <td className={tdClassChiffre}>
                          {s.jours_restants !== null && s.jours_restants <= 10 ? (
                            <Badge tone="warning">{s.jours_restants} j</Badge>
                          ) : (
                            (s.jours_restants ?? '—')
                          )}
                        </td>
                        <td className={tdClass}>
                          <Link to={`/stagiaires/${s.id}`}>
                            <Button type="button" variant="secondary" size="sm">
                              Ouvrir
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
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
