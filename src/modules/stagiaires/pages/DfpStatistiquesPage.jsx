import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getStagiairesStatistiques } from '../api/stagiairesApi';
import { RapportPeriodiqueForm } from '../../kernel/components/RapportPeriodiqueForm';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { PeriodSelector } from '../../../shared/components/ui/PeriodSelector';
import { SkeletonChart } from '../../../shared/components/ui/Skeleton';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { CHART_COLORS } from '../../../shared/chartColors';

const BAR_COLOR = CHART_COLORS.ontBlue600; // série unique de magnitude : une seule teinte, cf. skill dataviz
const AXIS_TICK = { fill: CHART_COLORS.axisTick, fontSize: 12 };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-field border border-border-strong bg-surface-raised px-3 py-2 text-xs shadow-raised">
      <p className="font-medium text-text">{label}</p>
      <p className="text-text-muted">{payload[0].value} stagiaire(s)</p>
    </div>
  );
}

/**
 * Statistiques globales de la DFP (toutes directions confondues) et export
 * du rapport périodique pour la tutelle — séparées du tableau de bord
 * principal pour ne pas le surcharger.
 */
export function DfpStatistiquesPage() {
  const [periode, setPeriode] = useState('30j');
  const [stats, setStats] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    getStagiairesStatistiques({ periode })
      .then(setStats)
      .finally(() => setChargement(false));
  }, [periode]);

  const donneesParDirection = useMemo(
    () => (stats?.par_direction ?? []).map((d) => ({ nom: d.direction_nom, total: d.total })),
    [stats],
  );

  const donneesEvolution = useMemo(
    () => (stats?.evolution ?? []).map((e) => ({ periode: e.periode, total: e.total })),
    [stats],
  );

  return (
    <div>
      <PageHeader
        title="Statistiques"
        description="Statistiques globales des stagiaires accueillis à l'ONT et export du rapport pour la tutelle."
        action={<PeriodSelector value={periode} onChange={setPeriode} />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {chargement ? (
          <>
            <SkeletonChart />
            <SkeletonChart />
          </>
        ) : (
          <>
            <Card>
              <CardHeader title="Évolution des dossiers reçus" description="Sur la période sélectionnée" />
              <CardBody>
                {donneesEvolution.length === 0 ? (
                  <EmptyState title="Aucun dossier sur cette période" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={donneesEvolution} margin={{ left: -20, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="periode" tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: CHART_COLORS.ontBlue600, strokeWidth: 1 }} />
                      <Line type="monotone" dataKey="total" stroke={BAR_COLOR} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Répartition par direction" description="Stagiaires affectés, en stage ou en évaluation" />
              <CardBody>
                {donneesParDirection.length === 0 ? (
                  <EmptyState title="Aucune affectation active" description="Les stagiaires affectés apparaîtront ici par direction d'accueil." />
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(180, donneesParDirection.length * 40)}>
                    <BarChart data={donneesParDirection} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nom" width={160} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(30,95,168,0.08)' }} />
                      <Bar dataKey="total" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>

      <RapportPeriodiqueForm />
    </div>
  );
}
