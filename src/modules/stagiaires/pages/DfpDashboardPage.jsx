import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ClipboardList, GraduationCap, Mail, MailCheck, Star, Users } from 'lucide-react';
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
import { CHART_COLORS } from '../../../shared/chartColors';
import { useRequete } from '../../../shared/hooks/useRequete';

const LIEN_VOIR_TOUT = 'text-sm font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400';
const AXIS_TICK = { fill: CHART_COLORS.axisTick, fontSize: 12 };

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
 * Chaque alerte mène directement au dossier concerné — voir GET
 * /stagiaires/alertes. Convention de couleur : ont-gold (warning) pour "à
 * surveiller", rouge (danger) réservé aux cas vraiment critiques (voir la
 * carte "Demandes en attente" ci-dessous, qui bloque un dossier depuis
 * plusieurs jours sans aucun traitement).
 */
function ListeAlertes({ items, chargement, vide, rendu }) {
  if (chargement) return <LoadingBlock />;
  if (items.length === 0) return <EmptyState title={vide} />;
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to={`/stagiaires/${item.id}`}
            className="flex items-center justify-between gap-3 py-2.5 text-sm text-text-muted hover:text-ont-blue-700"
          >
            {rendu(item)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Tableau de bord DFP : ce qu'un agent doit réellement savoir pour agir
 * (alertes cliquables en premier), puis les métriques et graphiques de
 * pilotage. Les listes complètes (courrier, stagiaires actifs, historique)
 * et les statistiques globales / export tutelle vivent sur leurs propres
 * pages, accessibles depuis la sidebar.
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
        <>
          <SkeletonStatCards />
          <SkeletonStatCards />
        </>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Stagiaires actifs"
              value={stats?.stagiaires_affectes ?? '—'}
              icon={<Users size={22} />}
              tone="primary"
              hint="Toutes directions confondues"
            />
            <StatCard
              label="Dossiers en attente d'affectation"
              value={stats?.en_attente_affectation ?? '—'}
              icon={<ClipboardList size={22} />}
              tone={stats?.en_attente_affectation > 0 ? 'accent' : 'neutral'}
            />
            <StatCard
              label="Échéance ≤ 10 jours"
              value={stats?.echeance_10_jours ?? '—'}
              icon={<AlertTriangle size={22} />}
              tone={stats?.echeance_10_jours > 0 ? 'accent' : 'success'}
            />
            <StatCard
              label="Taux moyen d'évaluation"
              value={stats?.note_moyenne !== null && stats?.note_moyenne !== undefined ? `${stats.note_moyenne} / 100` : '—'}
              icon={<Star size={22} />}
              tone="accent"
            />
          </div>

          {/* Périmètre courrier propre de la DFP, en tant que direction : mêmes champs que le dashboard direction standard. */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Courriers reçus non traités"
              value={statsCourrier?.courriers_recus_non_traites ?? '—'}
              icon={<Mail size={22} />}
              tone="primary"
            />
            <StatCard
              label="Courriers envoyés en cours"
              value={statsCourrier?.courriers_emis_en_cours ?? '—'}
              icon={<MailCheck size={22} />}
              tone="neutral"
            />
            <StatCard
              label="Dossiers reçus"
              value={stats?.dossiers_recus_periode ?? '—'}
              variation={stats?.dossiers_recus_variation}
              icon={<ClipboardList size={22} />}
              tone="neutral"
            />
            <StatCard
              label="Stages clôturés"
              value={stats?.stages_clotures_periode ?? '—'}
              variation={stats?.stages_clotures_variation}
              icon={<GraduationCap size={22} />}
              tone="success"
            />
          </div>
        </>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Demandes en attente de traitement" description="Depuis plus de 3 jours" />
          <CardBody>
            <ListeAlertes
              items={alertes?.demandes_en_attente ?? []}
              chargement={chargementAlertes}
              vide="Aucune demande en attente"
              rendu={(s) => (
                <>
                  <span className="min-w-0 flex-1 truncate">{s.nom}</span>
                  <Badge tone="danger">{s.statut_label}</Badge>
                </>
              )}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Échéance proche sans période d'évaluation ouverte" />
          <CardBody>
            <ListeAlertes
              items={stagesEcheanceSansPeriodeOuverte}
              chargement={chargementAlertes}
              vide="Aucun cas à signaler"
              rendu={(s) => (
                <>
                  <span className="min-w-0 flex-1 truncate">{s.nom}</span>
                  <Badge tone="warning">{s.jours_restants} j</Badge>
                </>
              )}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Évaluations incomplètes" description="Un seul des deux évaluateurs a soumis sa grille" />
          <CardBody>
            <ListeAlertes
              items={alertes?.evaluations_incompletes ?? []}
              chargement={chargementAlertes}
              vide="Aucune évaluation incomplète"
              rendu={(s) => (
                <>
                  <span className="min-w-0 flex-1 truncate">{s.nom}</span>
                  <Badge tone="warning">{s.manque === 'direction' ? 'Direction manquante' : 'DFP manquante'}</Badge>
                </>
              )}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Directions proches de leur quota" description="≥ 80% de la capacité maximale" />
          <CardBody>
            {chargementAlertes ? (
              <LoadingBlock />
            ) : (alertes?.directions_proches_quota ?? []).length === 0 ? (
              <EmptyState title="Aucune direction proche de son quota" />
            ) : (
              <ul className="divide-y divide-border">
                {alertes.directions_proches_quota.map((d) => (
                  <li key={d.direction_id} className="flex items-center justify-between gap-3 py-2.5 text-sm text-text-muted">
                    <span className="min-w-0 flex-1 truncate">{d.direction_nom}</span>
                    <Badge tone={d.taux >= 1 ? 'danger' : 'warning'}>
                      {d.occupation} / {d.capacite_max}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
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
                  <XAxis dataKey="direction_nom" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(30,95,168,0.08)' }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {parDirection.map((d) => (
                      <Cell key={d.direction_id} fill={directionsProchesQuotaParId.has(d.direction_id) ? CHART_COLORS.ontRed500 : CHART_COLORS.ontBlue600} />
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
                  <XAxis dataKey="mois" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_COLORS.ontGold500, strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="total" stroke={CHART_COLORS.ontGold500} strokeWidth={2} dot={{ r: 3 }} />
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
