import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock, FileSignature, Send, Users } from 'lucide-react';
import { getCourriersStatistiquesDg, listCourriers } from '../api/courrierApi';
import { getDgDisponibilite, updateDgDisponibilite } from '../../kernel/api/dgDisponibiliteApi';
import { getStagiairesAlertes, getStagiairesStatistiques } from '../../stagiaires/api/stagiairesApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Badge } from '../../../shared/components/ui/Badge';
import { StatCard } from '../../../shared/components/ui/StatCard';
import { PeriodSelector } from '../../../shared/components/ui/PeriodSelector';
import { SkeletonChart, SkeletonStatCards } from '../../../shared/components/ui/Skeleton';
import { Pagination } from '../../../shared/components/ui/Pagination';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import {
  TableWrap,
  tableClass,
  theadClass,
  thClass,
  tbodyClass,
  tdClass,
  tdClassPremiere,
  trHoverClass,
  SkeletonRows,
} from '../../../shared/components/ui/Table';
import { ZoneAlertes } from '../../../shared/components/ZoneAlertes';
import { CHART_COLORS } from '../../../shared/chartColors';
import { STATUT_LABELS, TYPE_LABELS } from '../constants';

const SEUIL_JOURS = 5;
const AXIS_TICK = { fill: CHART_COLORS.axisTick, fontSize: 11 };

function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-field border border-border-strong bg-surface-raised px-3 py-2 text-xs shadow-raised">
      <p className="font-medium text-text">{label}</p>
      <p className="text-text-muted">{payload[0].value}</p>
    </div>
  );
}

/**
 * Espace consolidé de la Direction Générale : distinct de sa file de
 * traitement (CircuitQueuePage) — une vue d'ensemble transverse, pas une
 * liste d'actions à accomplir. Le tableau ci-dessous est volontairement
 * une vue de suivi (tous statuts, filtrable), pas une file d'actions — il
 * complète, plutôt qu'il ne remplace, la zone d'alertes au-dessus (qui ne
 * porte que sur ce qui attend réellement une décision de la DG).
 */
export function CourrierDgDashboardPage() {
  const [periode, setPeriode] = useState('30j');
  const [statsCourrier, setStatsCourrier] = useState(null);
  const [statsStagiaires, setStatsStagiaires] = useState(null);
  const [statsChargement, setStatsChargement] = useState(true);

  const [statutFiltre, setStatutFiltre] = useState('');
  const [page, setPage] = useState(1);
  const [courriers, setCourriers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [chargementTable, setChargementTable] = useState(true);

  const [disponible, setDisponible] = useState(true);
  const [envoiDisponibilite, setEnvoiDisponibilite] = useState(false);

  const [alertesStagiaires, setAlertesStagiaires] = useState(null);
  const [attenteAvisDg, setAttenteAvisDg] = useState([]);
  const [attenteRelecture, setAttenteRelecture] = useState([]);
  const [chargementAlertes, setChargementAlertes] = useState(true);

  useEffect(() => {
    getDgDisponibilite().then(setDisponible);
  }, []);

  async function basculerDisponibilite() {
    setEnvoiDisponibilite(true);
    try {
      setDisponible(await updateDgDisponibilite(!disponible));
    } finally {
      setEnvoiDisponibilite(false);
    }
  }

  useEffect(() => {
    setStatsChargement(true);
    Promise.all([getCourriersStatistiquesDg(SEUIL_JOURS, periode), getStagiairesStatistiques({ periode })])
      .then(([courrier, stagiaires]) => {
        setStatsCourrier(courrier);
        setStatsStagiaires(stagiaires);
      })
      .finally(() => setStatsChargement(false));
  }, [periode]);

  useEffect(() => {
    setChargementTable(true);
    const params = { page };
    if (statutFiltre) params.statut = statutFiltre;
    listCourriers(params)
      .then(({ data, meta: metaPage }) => {
        setCourriers(data);
        setMeta(metaPage);
      })
      .finally(() => setChargementTable(false));
  }, [statutFiltre, page]);

  useEffect(() => {
    setPage(1);
  }, [statutFiltre]);

  // Zone d'alertes (Lot C3) : exactement la définition serveur de
  // "en_attente_decision" (statut en_attente_avis_dg OU en_relecture, voir
  // CourrierStatistiqueController::dg()), plus les stagiaires à échéance —
  // jamais une agrégation approximative refaite côté client.
  useEffect(() => {
    setChargementAlertes(true);
    Promise.all([
      listCourriers({ statut: 'en_attente_avis_dg' }),
      listCourriers({ statut: 'en_relecture' }),
      getStagiairesAlertes(),
    ])
      .then(([avisDg, relecture, alertesStag]) => {
        setAttenteAvisDg(avisDg.data);
        setAttenteRelecture(relecture.data);
        setAlertesStagiaires(alertesStag);
      })
      .finally(() => setChargementAlertes(false));
  }, []);

  const lignesAlertes = useMemo(() => {
    return [
      // Un dossier qui a bouclé au-delà du seuil configuré (voir
      // config('courrier.circuit.tours_avant_alerte')) est bloqué : signalé
      // en premier, gravité la plus haute — voir
      // CourrierCircuitService::representerDg().
      ...(statsCourrier?.dossiers_en_boucle ?? []).map((c) => ({
        id: `boucle-${c.id}`,
        to: `/courriers/${c.id}`,
        gravite: 'danger',
        texte: c.objet,
        detail: `${c.tour}ᵉ passage`,
      })),
      ...attenteAvisDg.map((c) => ({ id: `avis-${c.id}`, to: `/courriers/${c.id}`, gravite: 'warning', texte: c.objet, detail: 'Avis à rendre' })),
      ...attenteRelecture.map((c) => ({ id: `signature-${c.id}`, to: `/courriers/${c.id}`, gravite: 'warning', texte: c.objet, detail: 'Signature à donner' })),
      ...(alertesStagiaires?.echeance_10_jours ?? []).map((s) => ({
        id: `echeance-${s.id}`,
        to: `/stagiaires/${s.id}`,
        gravite: 'info',
        texte: s.nom,
        detail: `${s.jours_restants} j`,
      })),
    ];
  }, [statsCourrier, attenteAvisDg, attenteRelecture, alertesStagiaires]);

  const parDirection = useMemo(
    () => (statsStagiaires?.par_direction ?? []).map((d) => ({ nom: d.direction_nom, total: d.total })),
    [statsStagiaires],
  );
  const evolution = useMemo(() => statsStagiaires?.evolution ?? [], [statsStagiaires]);

  return (
    <div>
      <PageHeader
        title="Espace Direction Générale"
        description="Vue d'ensemble consolidée, toutes directions confondues."
        action={
          <div className="flex items-center gap-3">
            <Badge tone={disponible ? 'success' : 'warning'}>{disponible ? 'Disponible' : 'Indisponible — DGA en intérim'}</Badge>
            <Button type="button" variant="secondary" size="sm" disabled={envoiDisponibilite} onClick={basculerDisponibilite}>
              {disponible ? 'Me marquer indisponible' : 'Me marquer disponible'}
            </Button>
            <PeriodSelector value={periode} onChange={setPeriode} />
          </div>
        }
      />

      {statsChargement ? (
        <SkeletonStatCards />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="En attente de ma décision"
            value={statsCourrier.en_attente_decision}
            icon={<FileSignature size={22} />}
            tone={statsCourrier.en_attente_decision > 0 ? 'accent' : 'primary'}
            hint="Avis à rendre ou signature"
          />
          <StatCard
            label={`En attente depuis > ${statsCourrier.seuil_jours} j`}
            value={statsCourrier.en_attente_depuis_longtemps}
            icon={<Clock size={22} />}
            tone={statsCourrier.en_attente_depuis_longtemps > 0 ? 'danger' : 'primary'}
            hint="Toutes étapes, toutes directions"
          />
          <StatCard
            label="Courriers initiés par la DG"
            value={statsCourrier.courriers_initie_par_dg_periode}
            variation={statsCourrier.courriers_initie_par_dg_variation}
            icon={<Send size={22} />}
            tone="primary"
            hint="Distinct des courriers reçus traités"
          />
          <StatCard
            label="Stagiaires actifs"
            value={statsStagiaires.stagiaires_actifs}
            variation={statsStagiaires.stagiaires_actifs_variation}
            icon={<Users size={22} />}
            tone="primary"
          />
        </div>
      )}

      <div className="mb-6">
        <ZoneAlertes items={lignesAlertes} chargement={chargementAlertes} videTitre="Rien n'attend votre décision" />
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
              <CardHeader title="Évolution des stagiaires accueillis" description="Sur la période sélectionnée" />
              <CardBody>
                {evolution.length === 0 ? (
                  <EmptyState title="Aucun dossier sur cette période" />
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={evolution} margin={{ left: -20, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                      <XAxis dataKey="periode" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip content={<VolumeTooltip />} cursor={{ stroke: CHART_COLORS.ontBlue500, strokeWidth: 1 }} />
                      <Line type="monotone" dataKey="total" stroke={CHART_COLORS.ontBlue500} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Répartition des stagiaires par direction" />
              <CardBody>
                {parDirection.length === 0 ? (
                  <EmptyState title="Aucun stagiaire actif pour le moment" />
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(180, parDirection.length * 40)}>
                    <BarChart data={parDirection} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="nom" width={180} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                      <Tooltip content={<VolumeTooltip />} cursor={{ fill: 'rgba(35,133,241,0.08)' }} />
                      <Bar dataKey="total" fill={CHART_COLORS.ontViolet500} radius={[0, 4, 4, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader title="Suivi des courriers" description="Toutes directions confondues" />
        <CardBody>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Statut" htmlFor="statut-dg">
              <select id="statut-dg" className={inputClass} value={statutFiltre} onChange={(e) => setStatutFiltre(e.target.value)}>
                <option value="">Tous</option>
                {Object.entries(STATUT_LABELS).map(([valeur, libelle]) => (
                  <option key={valeur} value={valeur}>
                    {libelle}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {!chargementTable && courriers.length === 0 ? (
            <EmptyState title="Aucun courrier ne correspond" />
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Référence</th>
                    <th className={thClass}>Objet</th>
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Statut</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargementTable ? (
                    <SkeletonRows colonnes={5} />
                  ) : (
                    courriers.map((c) => (
                      <tr key={c.id} className={trHoverClass}>
                        <td className={`${tdClassPremiere} whitespace-nowrap`}>{c.numero_accuse_reception}</td>
                        <td className={`${tdClass} max-w-[16rem] truncate`} title={c.objet}>{c.objet}</td>
                        <td className={tdClass}>{TYPE_LABELS[c.type]}</td>
                        <td className={tdClass}>
                          <Badge tone="info">{c.statut_label}</Badge>
                        </td>
                        <td className={tdClass}>
                          <Link to={`/courriers/${c.id}`}>
                            <Button type="button" variant="secondary" size="sm">
                              Suivre
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
