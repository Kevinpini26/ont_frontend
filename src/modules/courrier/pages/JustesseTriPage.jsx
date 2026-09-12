import { getJustesseTri } from '../api/courrierApi';
import { useRequete } from '../../../shared/hooks/useRequete';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { StatCard } from '../../../shared/components/ui/StatCard';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { SkeletonStatCards } from '../../../shared/components/ui/Skeleton';
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
import { Target } from 'lucide-react';

// Statique (pas theadClass, qui est sticky) : ce tableau reste toujours
// court, jamais scrollable sur sa propre hauteur — un en-tête collant s'y
// superposerait à l'unique ligne de contenu plutôt que de l'accompagner
// au défilement (même correctif que TableauRepartitionDetailPage).
const theadClassStatique = 'border-b border-border bg-surface text-label font-semibold uppercase tracking-wide text-text-subtle';

function formaterTaux(taux) {
  return taux === null || taux === undefined ? '—' : `${Math.round(taux * 100)} %`;
}

/**
 * Lot C, point 3 : réservé au Secrétariat 01 (voir CourrierPolicy::
 * voirJustesseTri()) — jamais pour désigner une faute individuelle,
 * seulement pour objectiver un taux de réorientation du tri par la DG.
 */
export function JustesseTriPage() {
  const { donnees, chargement } = useRequete(() => getJustesseTri(), []);
  const global = donnees?.global;
  const parAgent = donnees?.par_agent ?? [];

  return (
    <div>
      <PageHeader
        title="Justesse du tri"
        description="Taux de réorientation des dossiers triés vers la DG — un signalement, jamais une sanction."
      />

      {chargement ? (
        <SkeletonStatCards count={3} />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Dossiers triés" value={global?.nombre_tries ?? 0} icon={<Target size={20} />} />
          <StatCard label="Réorientés par la DG" value={global?.nombre_reoriented ?? 0} icon={<Target size={20} />} />
          <StatCard label="Taux de justesse" value={formaterTaux(global?.taux_justesse)} icon={<Target size={20} />} />
        </div>
      )}

      <Card>
        <CardHeader title="Par agent" />
        <CardBody className="p-0">
          {!chargement && parAgent.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Target size={32} />} title="Aucun tri enregistré" description="Le taux de justesse apparaîtra ici dès qu'un dossier aura été trié." />
            </div>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClassStatique}>
                  <tr>
                    <th className={thClass}>Agent</th>
                    <th className={thClass}>Triés</th>
                    <th className={thClass}>Réorientés</th>
                    <th className={thClass}>Taux de justesse</th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargement ? (
                    <SkeletonRows colonnes={4} />
                  ) : (
                    parAgent.map((ligne) => (
                      <tr key={ligne.agent_id} className={trHoverClass}>
                        <td className={tdClassPremiere}>{ligne.agent_nom ?? `#${ligne.agent_id}`}</td>
                        <td className={tdClass}>{ligne.nombre_tries}</td>
                        <td className={tdClass}>{ligne.nombre_reoriented}</td>
                        <td className={tdClass}>{formaterTaux(ligne.taux_justesse)}</td>
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
