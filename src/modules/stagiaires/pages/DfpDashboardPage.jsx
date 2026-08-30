import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClipboardList, GraduationCap, Mail, Users } from 'lucide-react';
import { listStagiaires, getStagiairesStatistiques, getStagiairesAlertes } from '../api/stagiairesApi';
import { getCourriersStatistiquesDirection, listCourriers } from '../../courrier/api/courrierApi';
import { STATUT_LABELS } from '../constants';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { StatCard } from '../../../shared/components/ui/StatCard';
import { PeriodSelector } from '../../../shared/components/ui/PeriodSelector';
import { SkeletonStatCards } from '../../../shared/components/ui/Skeleton';
import { ZoneAlertes } from '../../../shared/components/ZoneAlertes';
import { CHART_COLORS } from '../../../shared/chartColors';
import { useRequete } from '../../../shared/hooks/useRequete';

const LIEN_VOIR_TOUT = 'text-sm font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400';
const AXIS_TICK = { fill: CHART_COLORS.axisTick, fontSize: 11 };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-field border border-border-strong bg-surface-raised px-3 py-2 text-xs shadow-raised">
      <p className="font-medium text-text">{label}</p>
      <p className="text-text-muted">{payload[0].value}</p>
    </div>
  );
}

function DerniersCourriers({ courriers, chargement }) {
  if (chargement) return <LoadingBlock />;
  if (courriers.length === 0) return <EmptyState icon={<Mail size={28} />} title="Aucun courrier pour le moment" />;
  return (
    <ul className="divide-y divide-border">
      {courriers.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <Link to={`/courriers/${c.id}`} className="min-w-0 flex-1 truncate text-text-muted hover:text-ont-blue-700">
            {c.objet}
          </Link>
          <Badge tone="info">{STATUT_LABELS[c.statut]}</Badge>
        </li>
      ))}
    </ul>
  );
}

function DerniersStagiaires({ stagiaires, chargement }) {
  if (chargement) return <LoadingBlock />;
  if (stagiaires.length === 0) return <EmptyState icon={<GraduationCap size={28} />} title="Aucun stagiaire pour le moment" />;
  return (
    <ul className="divide-y divide-border">
      {stagiaires.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <Link to={`/stagiaires/${s.id}`} className="min-w-0 flex-1 truncate text-text-muted hover:text-ont-blue-700">
            {s.nom}
          </Link>
          <Badge tone="info">{s.statut_label}</Badge>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tableau de bord DFP : ce qu'un agent doit réellement savoir pour agir
 * (4 chiffres clés, puis une zone d'alertes unique), avant les graphiques
 * de pilotage. Le taux moyen d'évaluation et les volumes bruts (dossiers
 * reçus, stages clôturés, courriers émis) ne sont plus repris ici — un
 * tableau de bord n'est pas l'endroit pour retenir six chiffres ou plus,
 * ils restent consultables sur Statistiques et sur les listes complètes.
 */
export function DfpDashboardPage() {
  const [periode, setPeriode] = useState('30j');
  const { donnees: statsReponse, chargement: statsChargement } = useRequete(
    (signal) =>
      Promise.all([getStagiairesStatistiques({ periode }, signal), getCourriersStatistiquesDirection(periode, signal)]),
    [periode],
  );
  const [stats, statsCourrier] = statsReponse ?? [null, null];

  const [alertes, setAlertes] = useState(null);
  const [chargementAlertes, setChargementAlertes] = useState(true);

  const [courriers, setCourriers] = useState([]);
  const [chargementCourriers, setChargementCourriers] = useState(true);
  const [stagiaires, setStagiaires] = useState([]);
  const [chargementStagiaires, setChargementStagiaires] = useState(true);

  useEffect(() => {
    setChargementAlertes(true);
    getStagiairesAlertes()
      .then(setAlertes)
      .finally(() => setChargementAlertes(false));

    setChargementCourriers(true);
    listCourriers()
      .then(({ data }) => setCourriers([...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)))
      .finally(() => setChargementCourriers(false));

    setChargementStagiaires(true);
    listStagiaires({ page: 1, en_cours: 1 })
      .then(({ data }) => setStagiaires(data.slice(0, 5)))
      .finally(() => setChargementStagiaires(false));
  }, []);

  // "Stages proches de l'échéance sans période d'évaluation ouverte" :
  // intersection des deux listes d'alertes déjà chargées, pas un appel
  // serveur dédié.
  const stagesEcheanceSansPeriodeOuverte = useMemo(() => {
    if (!alertes) return [];
    const idsAttenteOuverture = new Set(alertes.evaluation_attente_ouverture.map((s) => s.id));
    return alertes.echeance_10_jours.filter((s) => idsAttenteOuverture.has(s.id));
  }, [alertes]);

  /*
   * Zone d'alertes unifiée (Lot C3) : quatre catégories jusqu'ici en cartes
   * séparées, désormais une seule liste de lignes. "Demandes en attente"
   * reste la seule vraiment bloquante (rouge) — les trois autres sont "à
   * surveiller" (or), pas critiques.
   */
  const lignesAlertes = useMemo(() => {
    if (!alertes) return [];
    return [
      ...alertes.demandes_en_attente.map((s) => ({
        id: `demande-${s.id}`,
        to: `/stagiaires/${s.id}`,
        gravite: 'danger',
        texte: s.nom,
        detail: s.statut_label,
      })),
      ...stagesEcheanceSansPeriodeOuverte.map((s) => ({
        id: `echeance-${s.id}`,
        to: `/stagiaires/${s.id}`,
        gravite: 'warning',
        texte: s.nom,
        detail: `${s.jours_restants} j`,
      })),
      ...alertes.evaluations_incompletes.map((s) => ({
        id: `evaluation-${s.id}`,
        to: `/stagiaires/${s.id}`,
        gravite: 'warning',
        texte: s.nom,
        detail: s.manque === 'direction' ? 'Direction manquante' : 'DFP manquante',
      })),
      ...alertes.directions_proches_quota.map((d) => ({
        id: `quota-${d.direction_id}`,
        to: `/stagiaires/actifs?direction_id=${d.direction_id}`,
        gravite: d.taux >= 1 ? 'danger' : 'warning',
        texte: d.direction_nom,
        detail: `${d.occupation} / ${d.capacite_max}`,
      })),
    ];
  }, [alertes, stagesEcheanceSansPeriodeOuverte]);

  const directionsProchesQuotaParId = useMemo(() => {
    const map = new Map();
    (alertes?.directions_proches_quota ?? []).forEach((d) => map.set(d.direction_id, d));
    return map;
  }, [alertes]);

  const parDirection = stats?.par_direction ?? [];
  const tendanceCandidatures = statsCourrier?.tendance_candidatures_12_mois ?? [];

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble des stagiaires accueillis à l'ONT."
        action={<PeriodSelector value={periode} onChange={setPeriode} />}
      />

      {statsChargement ? (
        <SkeletonStatCards />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Stagiaires actifs"
            value={stats?.stagiaires_affectes ?? '—'}
            icon={<Users size={22} />}
            tone="primary"
            hint="Toutes directions confondues"
            to="/stagiaires/actifs"
          />
          <StatCard
            label="Dossiers en attente d'affectation"
            value={stats?.en_attente_affectation ?? '—'}
            icon={<ClipboardList size={22} />}
            tone={stats?.en_attente_affectation > 0 ? 'accent' : 'primary'}
            to="/stagiaires/actifs?statut=en_attente_affectation"
          />
          <StatCard
            label="Échéance ≤ 10 jours"
            value={stats?.echeance_10_jours ?? '—'}
            icon={<ClipboardList size={22} />}
            tone={stats?.echeance_10_jours > 0 ? 'accent' : 'primary'}
            to="/stagiaires/actifs?onglet=echeance"
          />
          <StatCard
            label="Courriers reçus non traités"
            value={statsCourrier?.courriers_recus_non_traites ?? '—'}
            icon={<Mail size={22} />}
            tone={statsCourrier?.courriers_recus_non_traites > 0 ? 'accent' : 'primary'}
            to="/stagiaires/courrier?statut=recu"
          />
        </div>
      )}

      <div className="mb-6">
        <ZoneAlertes items={lignesAlertes} chargement={chargementAlertes} videTitre="Aucun dossier ne nécessite votre attention" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Stagiaires actifs par direction" description="Directions proches de leur quota en rouge" />
          <CardBody>
            {parDirection.every((d) => d.total === 0) ? (
              <EmptyState title="Aucun stagiaire actif" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={parDirection} margin={{ left: -20, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="direction_nom" tick={{ ...AXIS_TICK }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(35,133,241,0.08)' }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {parDirection.map((d) => (
                      <Cell key={d.direction_id} fill={directionsProchesQuotaParId.has(d.direction_id) ? CHART_COLORS.ontRed500 : CHART_COLORS.ontBlue500} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tendance des candidatures" description="Demandes de stage reçues sur 12 mois" />
          <CardBody>
            {tendanceCandidatures.length === 0 ? (
              <EmptyState title="Aucune candidature sur cette période" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={tendanceCandidatures} margin={{ left: -20, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="mois" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_COLORS.ontGold600, strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="total" stroke={CHART_COLORS.ontGold600} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Derniers courriers" action={<Link to="/stagiaires/courrier" className={LIEN_VOIR_TOUT}>Voir tout →</Link>} />
          <CardBody>
            <DerniersCourriers courriers={courriers} chargement={chargementCourriers} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Derniers stagiaires" action={<Link to="/stagiaires/actifs" className={LIEN_VOIR_TOUT}>Voir tout →</Link>} />
          <CardBody>
            <DerniersStagiaires stagiaires={stagiaires} chargement={chargementStagiaires} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
