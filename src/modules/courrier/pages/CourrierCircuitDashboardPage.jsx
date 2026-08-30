import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock, FileSearch, Mail } from 'lucide-react';
import { getCourriersStatistiques } from '../api/courrierApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { StatCard } from '../../../shared/components/ui/StatCard';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { CHART_COLORS } from '../../../shared/chartColors';

const BAR_COLOR = CHART_COLORS.ontBlue600; // série unique de magnitude, une seule teinte
const ACCENT_BAR_COLOR = CHART_COLORS.ontGold500; // deuxième métrique (temps), pour la distinguer visuellement
const AXIS_TICK = { fill: CHART_COLORS.axisTick, fontSize: 11 };

function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-field border border-border-strong bg-surface-raised px-3 py-2 text-xs shadow-raised">
      <p className="font-medium text-text">{label}</p>
      <p className="text-text-muted">{payload[0].value} courrier(s)</p>
    </div>
  );
}

function DureeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-field border border-border-strong bg-surface-raised px-3 py-2 text-xs shadow-raised">
      <p className="font-medium text-text">{label}</p>
      <p className="text-text-muted">{payload[0].value} h en moyenne</p>
    </div>
  );
}

export function CourrierCircuitDashboardPage() {
  const [stats, setStats] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    getCourriersStatistiques()
      .then(setStats)
      .finally(() => setChargement(false));
  }, []);

  if (chargement) return <LoadingBlock />;

  return (
    <div>
      <PageHeader title="Tableau de bord du circuit courrier" description="Volumétrie et délais de traitement, toutes directions confondues." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Courriers en cours" value={stats.en_cours_total} icon={<Mail size={22} />} tone="primary" hint="Non encore enregistrés" />
        <StatCard
          label="En attente de relecture"
          value={stats.en_attente_relecture}
          icon={<FileSearch size={22} />}
          tone={stats.en_attente_relecture > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label="Étapes suivies"
          value={stats.temps_moyen_par_etape.length}
          icon={<Clock size={22} />}
          tone="accent"
          hint="Avec un délai moyen mesurable"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Courriers en cours par étape" description="Répartition actuelle des dossiers dans le circuit" />
          <CardBody>
            {stats.en_cours_total === 0 ? (
              <EmptyState title="Aucun courrier en cours" description="Toutes les files d'attente sont vides pour le moment." />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.par_statut} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={170} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(30,95,168,0.08)' }} />
                  <Bar dataKey="total" fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Temps moyen de traitement par étape" description="Heures écoulées avant d'atteindre chaque statut" />
          <CardBody>
            {stats.temps_moyen_par_etape.length === 0 ? (
              <EmptyState
                title="Pas encore assez de données"
                description="Le délai moyen apparaît dès qu'un courrier a franchi au moins deux étapes du circuit."
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.temps_moyen_par_etape} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                  <XAxis type="number" unit="h" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" width={170} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={<DureeTooltip />} cursor={{ fill: 'rgba(245,166,35,0.12)' }} />
                  <Bar dataKey="moyenne_heures" fill={ACCENT_BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
