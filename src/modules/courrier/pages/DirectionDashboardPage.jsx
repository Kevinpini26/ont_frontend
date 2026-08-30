import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Clock, GraduationCap, Mail, MailCheck, Users } from 'lucide-react';
import { getCourriersStatistiquesDirection, listCourriers } from '../api/courrierApi';
import { getStagiairesAlertes, getStagiairesStatistiques, listStagiaires } from '../../stagiaires/api/stagiairesApi';
import { STATUT_LABELS } from '../constants';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { StatCard } from '../../../shared/components/ui/StatCard';
import { PeriodSelector } from '../../../shared/components/ui/PeriodSelector';
import { SkeletonChart, SkeletonStatCards } from '../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { ZoneAlertes } from '../../../shared/components/ZoneAlertes';
import { CHART_COLORS } from '../../../shared/chartColors';

const AXIS_TICK = { fill: CHART_COLORS.axisTick, fontSize: 11 };
const LIEN_VOIR_TOUT = 'text-sm font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400';

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
 * Tableau de bord d'une direction d'accueil : 4 chiffres clés, une zone
 * d'alertes unique (avant : deux cartes séparées), puis les graphiques et
 * un aperçu condensé — les listes complètes vivent sur leurs propres pages.
 */
export function DirectionDashboardPage() {
  const [periode, setPeriode] = useState('30j');
  const [statsCourrier, setStatsCourrier] = useState(null);
  const [statsStagiaires, setStatsStagiaires] = useState(null);
  const [statsChargement, setStatsChargement] = useState(true);

  const [alertes, setAlertes] = useState(null);
  const [chargementAlertes, setChargementAlertes] = useState(true);

  const [courriers, setCourriers] = useState([]);
  const [chargementCourriers, setChargementCourriers] = useState(true);
  const [stagiaires, setStagiaires] = useState([]);
  const [chargementStagiaires, setChargementStagiaires] = useState(true);

  useEffect(() => {
    setStatsChargement(true);
    Promise.all([getCourriersStatistiquesDirection(periode), getStagiairesStatistiques({ periode })])
      .then(([courrier, stagiaires]) => {
        setStatsCourrier(courrier);
        setStatsStagiaires(stagiaires);
      })
      .finally(() => setStatsChargement(false));
  }, [periode]);

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

  const evolution = useMemo(() => statsStagiaires?.evolution ?? [], [statsStagiaires]);
  // Le dashboard ne doit jamais dépendre du volume d'archives accumulé :
  // exclut les dossiers clôturés de la répartition affichée ici (consultable
  // en détail sur l'historique dédié, voir HistoriqueStagiairesPage.jsx).
  const parStatut = useMemo(() => (statsStagiaires?.par_statut ?? []).filter((s) => s.statut !== 'cloture'), [statsStagiaires]);

  const lignesAlertes = useMemo(() => {
    if (!alertes) return [];
    return [
      ...alertes.evaluation_attente_ouverture.map((s) => ({
        id: `ouverture-${s.id}`,
        to: `/stagiaires/${s.id}`,
        gravite: 'warning',
        texte: s.nom,
        detail: s.statut_label,
      })),
      ...alertes.echeance_10_jours.map((s) => ({
        id: `echeance-${s.id}`,
        to: `/stagiaires/${s.id}`,
        gravite: 'warning',
        texte: s.nom,
        detail: `${s.jours_restants} j`,
      })),
    ];
  }, [alertes]);

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre direction : courrier et stagiaires accueillis."
        action={<PeriodSelector value={periode} onChange={setPeriode} />}
      />

      {statsChargement ? (
        <SkeletonStatCards />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Courriers non traités > 48h"
            value={statsCourrier?.courriers_recus_non_traites_48h ?? '—'}
            icon={<Clock size={22} />}
            tone={statsCourrier?.courriers_recus_non_traites_48h > 0 ? 'danger' : 'primary'}
            to="/direction/courrier?statut=recu"
          />
          <StatCard
            label="Courriers envoyés en cours"
            value={statsCourrier?.courriers_emis_en_cours ?? '—'}
            icon={<MailCheck size={22} />}
            tone="primary"
            to="/direction/courrier"
          />
          <StatCard
            label="Stagiaires affectés"
            value={statsStagiaires?.stagiaires_affectes ?? '—'}
            icon={<Users size={22} />}
            tone="primary"
            to="/direction/stagiaires"
          />
          <StatCard
            label="Stages échéance ≤ 10 j"
            value={statsStagiaires?.echeance_10_jours ?? '—'}
            icon={<AlertTriangle size={22} />}
            tone={statsStagiaires?.echeance_10_jours > 0 ? 'accent' : 'primary'}
            to="/direction/stagiaires"
          />
        </div>
      )}

      <div className="mb-6">
        <ZoneAlertes items={lignesAlertes} chargement={chargementAlertes} videTitre="Aucune alerte pour le moment" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {statsChargement ? (
          <>
            <SkeletonChart />
            <SkeletonChart />
          </>
        ) : (
          <>
            <Card>
              <CardHeader title="Évolution des dossiers de stagiaires" description="Sur la période sélectionnée" />
              <CardBody>
                {evolution.length === 0 ? (
                  <EmptyState title="Aucun dossier sur cette période" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={evolution} margin={{ left: -20, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="periode" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_COLORS.ontBlue500, strokeWidth: 1 }} />
                      <Line type="monotone" dataKey="total" stroke={CHART_COLORS.ontBlue500} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Répartition par statut" description="Stagiaires de votre direction" />
              <CardBody>
                {parStatut.every((s) => s.total === 0) ? (
                  <EmptyState title="Aucun stagiaire pour le moment" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={parStatut} margin={{ left: -20, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(35,133,241,0.08)' }} />
                      <Bar dataKey="total" fill={CHART_COLORS.ontViolet500} radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Derniers courriers" action={<Link to="/direction/courrier" className={LIEN_VOIR_TOUT}>Voir tout →</Link>} />
          <CardBody>
            <DerniersCourriers courriers={courriers} chargement={chargementCourriers} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Derniers stagiaires" action={<Link to="/direction/stagiaires" className={LIEN_VOIR_TOUT}>Voir tout →</Link>} />
          <CardBody>
            <DerniersStagiaires stagiaires={stagiaires} chargement={chargementStagiaires} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
