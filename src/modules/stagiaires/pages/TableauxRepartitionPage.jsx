import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { listTableauxRepartition, creerTableauRepartition } from '../api/tableauxRepartitionApi';
import { useRequete } from '../../../shared/hooks/useRequete';
import { useAuthStore } from '../../kernel/store/authStore';
import { ROLES } from '../../kernel/constants';
import { TABLEAU_REPARTITION_STATUT_LABELS } from '../constants';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Badge } from '../../../shared/components/ui/Badge';
import { Alert } from '../../../shared/components/ui/Alert';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { AnnonceChargement } from '../../../shared/components/ui/AnnonceChargement';
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

const TONE_STATUT = {
  brouillon: 'neutral',
  chez_reception: 'info',
  en_attente_avis_dg: 'warning',
  approuve: 'success',
};

export function TableauxRepartitionPage() {
  const user = useAuthStore((s) => s.user);
  const [periodeDebut, setPeriodeDebut] = useState('');
  const [periodeFin, setPeriodeFin] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const { donnees: reponse, chargement, recharger } = useRequete((signal) => listTableauxRepartition({}, signal), []);
  const tableaux = reponse?.data ?? [];

  const peutCreer = user?.role === ROLES.AGENT_DFP;

  async function creer(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await creerTableauRepartition(periodeDebut, periodeFin);
      setPeriodeDebut('');
      setPeriodeFin('');
      await recharger();
    } catch (err) {
      setErreur(err.response?.data?.message ?? "Impossible de créer le tableau.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div>
      <PageHeader title="Tableaux de répartition" description="Regroupement des demandes de stage en attente d'affectation, soumis à la Direction Générale." />

      {peutCreer && (
        <Card className="mb-6">
          <CardHeader title="Nouveau tableau" />
          <CardBody>
            {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}
            <form onSubmit={creer} className="flex flex-wrap items-end gap-3">
              <Field label="Période — début" htmlFor="periodeDebut">
                <input id="periodeDebut" type="date" className={inputClass} value={periodeDebut} onChange={(e) => setPeriodeDebut(e.target.value)} required />
              </Field>
              <Field label="Période — fin" htmlFor="periodeFin">
                <input id="periodeFin" type="date" className={inputClass} value={periodeFin} onChange={(e) => setPeriodeFin(e.target.value)} required />
              </Field>
              <Button type="submit" disabled={envoiEnCours}>
                {envoiEnCours ? 'Création…' : 'Créer'}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          {chargement ? (
            <AnnonceChargement />
          ) : tableaux.length === 0 ? (
            <EmptyState icon={<ClipboardList size={28} />} title="Aucun tableau" description="Aucun tableau de répartition pour le moment." />
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Période</th>
                    <th className={thClass}>Direction</th>
                    <th className={thClass}>Rédacteur</th>
                    <th className={thClass}>Statut</th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargement && <SkeletonRows colonnes={4} />}
                  {tableaux.map((t) => (
                    <tr key={t.id} className={trHoverClass}>
                      <td className={tdClassPremiere}>
                        <Link to={`/tableaux-repartition/${t.id}`} className="font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-300">
                          {t.periode_debut} — {t.periode_fin}
                        </Link>
                      </td>
                      <td className={tdClass}>{t.direction?.nom}</td>
                      <td className={tdClass}>{t.redacteur}</td>
                      <td className={tdClass}>
                        <Badge tone={TONE_STATUT[t.statut]}>{TABLEAU_REPARTITION_STATUT_LABELS[t.statut]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
