import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock, FileSearch, Mail } from 'lucide-react';
import { getCourriersStatistiques, listCourriers } from '../api/courrierApi';
import { libelleStatutCourrier } from '../utils/presentationCourrier';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { StatCard } from '../../../shared/components/ui/StatCard';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { SkeletonChart, SkeletonLines, SkeletonStatCards } from '../../../shared/components/ui/Skeleton';
import { CHART_COLORS } from '../../../shared/chartColors';
import { InstitutionBanner } from '../../../shared/components/InstitutionBanner';
import { useAuthStore } from '../../kernel/store/authStore';

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

function ListeCourriers({ courriers, chargement }) {
  if (chargement) return <SkeletonLines lignes={5} />;
  if (courriers.length === 0) return <EmptyState icon={<Mail size={28} />} title="Aucun courrier pour le moment" />;
  return (
    <ul className="divide-y divide-border">
      {courriers.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <Link to={`/courriers/${c.id}`} className="min-w-0 flex-1 truncate text-text-muted hover:text-ont-blue-700">
            {c.objet}
          </Link>
          <Badge tone="info">{libelleStatutCourrier(c)}</Badge>
        </li>
      ))}
    </ul>
  );
}

/**
 * Vue d'ensemble transverse du circuit courrier (pas de sélecteur de
 * période : "en cours"/"en attente de relecture" sont un état présent, pas
 * une tendance sur une plage de dates — voir aussi CourrierDgDashboardPage
 * pour un vrai tableau de bord périodique). Pas de zone d'alertes ici non
 * plus : les statuts agrégés de `stats.par_statut` n'identifient pas de
 * dossier précis à faire remonter sans une requête supplémentaire par
 * poste, hors de portée de ce lot — la file d'un poste précis (avec ses
 * dossiers "en transit") reste sur CircuitQueuePage.
 */
export function CourrierCircuitDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [enregistres, setEnregistres] = useState([]);
  const [chargementEnregistres, setChargementEnregistres] = useState(true);
  const [recents, setRecents] = useState([]);
  const [chargementRecents, setChargementRecents] = useState(true);

  useEffect(() => {
    getCourriersStatistiques()
      .then(setStats)
      .finally(() => setChargement(false));

    setChargementEnregistres(true);
    listCourriers({ statut: 'enregistre' })
      .then(({ data }) => setEnregistres([...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)))
      .finally(() => setChargementEnregistres(false));

    setChargementRecents(true);
    listCourriers()
      .then(({ data }) => setRecents([...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5)))
      .finally(() => setChargementRecents(false));
  }, []);

  return (
    <div>
      <PageHeader title={`Bonjour, ${user?.name?.split(' ')[0] ?? 'collègue'}`} description="Voici l’état de l’activité documentaire et des files de traitement." />

      <InstitutionBanner
        className="mb-6"
        title="Notre patrimoine, une responsabilité à transmettre."
        description="Le système documentaire de l’ONT garantit la continuité, la traçabilité et la conservation de chaque décision institutionnelle."
      />

      {chargement || !stats ? (
        <>
          <SkeletonStatCards count={3} />
          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Courriers en cours" value={stats.en_cours_total} icon={<Mail size={22} />} tone="primary" hint="Non encore enregistrés" />
            <StatCard
              label="En attente de relecture"
              value={stats.en_attente_relecture}
              icon={<FileSearch size={22} />}
              tone={stats.en_attente_relecture > 0 ? 'danger' : 'primary'}
            />
            <StatCard
              label="Étapes suivies"
              value={stats.temps_moyen_par_etape.length}
              icon={<Clock size={22} />}
              tone="primary"
              hint="Avec un délai moyen mesurable"
            />
            <StatCard
              label="Non triés en alerte"
              value={stats.courriers_non_tries_en_alerte.length}
              icon={<Clock size={22} />}
              tone={stats.courriers_non_tries_en_alerte.length > 0 ? 'danger' : 'primary'}
              hint={`En attente de tri depuis plus de ${stats.delai_alerte_tri_heures} h`}
            />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Courriers en cours par étape" description="Répartition actuelle des dossiers dans le circuit" />
              <CardBody>
                {stats.en_cours_total === 0 ? (
                  <EmptyState title="Aucun courrier en cours" description="Toutes les files d'attente sont vides pour le moment." />
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(160, Math.min(280, stats.par_statut.length * 42))}>
                    <BarChart data={stats.par_statut} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={170} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(35,133,241,0.08)' }} />
                      <Bar dataKey="total" fill={CHART_COLORS.ontBlue500} radius={[0, 4, 4, 0]} maxBarSize={20} />
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
                  <ResponsiveContainer width="100%" height={Math.max(160, Math.min(280, stats.temps_moyen_par_etape.length * 42))}>
                    <BarChart data={stats.temps_moyen_par_etape} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                      <XAxis type="number" unit="h" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="label" width={170} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip content={<DureeTooltip />} cursor={{ fill: 'rgba(215,160,3,0.12)' }} />
                      <Bar dataKey="moyenne_heures" fill={CHART_COLORS.ontGold600} radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Derniers courriers enregistrés" />
          <CardBody>
            <ListeCourriers courriers={enregistres} chargement={chargementEnregistres} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Courriers récemment reçus" />
          <CardBody>
            <ListeCourriers courriers={recents} chargement={chargementRecents} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
