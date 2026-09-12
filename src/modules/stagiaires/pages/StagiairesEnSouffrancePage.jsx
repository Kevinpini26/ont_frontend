import { Link } from 'react-router-dom';
import { getStagiairesEnSouffrance } from '../api/stagiairesApi';
import { useRequete } from '../../../shared/hooks/useRequete';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import {
  TableWrap,
  tableClass,
  thClass,
  tbodyClass,
  tdClass,
  tdClassPremiere,
  trHoverClass,
  SkeletonRows,
} from '../../../shared/components/ui/Table';
import { Clock } from 'lucide-react';

// Statique (pas theadClass, qui est sticky) : une liste de dossiers en
// souffrance reste par nature courte (l'exception, pas la norme) — un
// en-tête collant s'y superposerait au contenu plutôt que de
// l'accompagner au défilement (même correctif que
// TableauRepartitionDetailPage/JustesseTriPage).
const theadClassStatique = 'border-b border-border bg-surface text-label font-semibold uppercase tracking-wide text-text-subtle';

const NIVEAU = {
  1: { tone: 'warning', label: 'En retard' },
  2: { tone: 'warning', label: 'Retard important' },
  3: { tone: 'danger', label: 'Critique' },
};

function formaterAnciennete(heures) {
  if (heures < 24) return `${heures} h`;
  return `${Math.floor(heures / 24)} j ${heures % 24} h`;
}

/**
 * Lot C, point 5 : délai indicatif par étape, jamais bloquant — un simple
 * signalement pour la DFP (et la direction d'accueil, pour ses propres
 * dossiers en évaluation), même principe que l'équivalent côté courrier.
 */
export function StagiairesEnSouffrancePage() {
  const { donnees, chargement } = useRequete((signal) => getStagiairesEnSouffrance(signal), []);
  const lignes = donnees ?? [];

  return (
    <div>
      <PageHeader
        title="Dossiers en souffrance"
        description="Dossiers restés plus longtemps que le délai indicatif à leur étape courante — un signalement, jamais un blocage."
      />

      <Card>
        <CardBody className="p-0">
          {!chargement && lignes.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Clock size={32} />} title="Aucun dossier en souffrance" description="Tous les dossiers avancent dans les délais indicatifs." />
            </div>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClassStatique}>
                  <tr>
                    <th className={thClass}>Stagiaire</th>
                    <th className={thClass}>Direction</th>
                    <th className={thClass}>Statut</th>
                    <th className={thClass}>Ancienneté</th>
                    <th className={thClass}>Niveau</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargement ? (
                    <SkeletonRows colonnes={6} />
                  ) : (
                    lignes.map((ligne) => (
                      <tr key={ligne.stagiaire.id} className={trHoverClass}>
                        <td className={tdClassPremiere}>{ligne.stagiaire.nom}</td>
                        <td className={tdClass}>{ligne.stagiaire.direction?.nom ?? '—'}</td>
                        <td className={tdClass}>{ligne.stagiaire.statut_label}</td>
                        <td className={tdClass}>{formaterAnciennete(ligne.anciennete_heures)}</td>
                        <td className={tdClass}>
                          <Badge tone={NIVEAU[ligne.niveau]?.tone ?? 'neutral'}>{NIVEAU[ligne.niveau]?.label ?? ligne.niveau}</Badge>
                        </td>
                        <td className={tdClass}>
                          <Link to={`/stagiaires/${ligne.stagiaire.id}`} className="text-sm font-medium text-ont-blue-700 underline">
                            Voir le dossier
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableWrap>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
