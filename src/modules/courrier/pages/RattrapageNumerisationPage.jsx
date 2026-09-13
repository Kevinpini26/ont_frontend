import { Link } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { listCourriersANumeriser } from '../api/courrierApi';
import { useRequete } from '../../../shared/hooks/useRequete';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { TableWrap, tableClass, theadClass, thClass, tbodyClass, tdClass, tdClassPremiere, trHoverClass, SkeletonRows } from '../../../shared/components/ui/Table';

/**
 * Liste de rattrapage (Réception/administrateur) des courriers enregistrés
 * sans que la numérisation ait pu être faite le jour même — voir
 * docs/numerisation-courrier.md et CourrierRattrapageNumerisationController.
 * Le dépôt n'est jamais bloqué pour autant : ce tableau permet juste de ne
 * pas perdre ces dossiers de vue tant qu'ils n'ont pas de scan.
 */
export function RattrapageNumerisationPage() {
  const { donnees, chargement } = useRequete(() => listCourriersANumeriser(), []);
  const courriers = donnees ?? [];

  return (
    <div>
      <PageHeader
        title="Documents à numériser"
        description="Courriers enregistrés sans scan disponible le jour même (coupure, copieur en panne...) — à numériser dès que possible."
      />

      <Card>
        <CardBody className="p-0">
          {!chargement && courriers.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<ScanLine size={32} />} title="Rien à rattraper" description="Tous les courriers déposés ont un scan disponible." />
            </div>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Référence</th>
                    <th className={thClass}>Objet</th>
                    <th className={thClass}>Origine</th>
                    <th className={thClass}>Reçu le</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargement ? (
                    <SkeletonRows colonnes={5} />
                  ) : (
                    courriers.map((c) => (
                      <tr key={c.id} className={trHoverClass}>
                        <td className={tdClassPremiere}>{c.numero_accuse_reception}</td>
                        <td className={tdClass}>{c.objet}</td>
                        <td className={tdClass}>{c.direction_origine?.nom ?? c.expediteur_externe_nom ?? '—'}</td>
                        <td className={tdClass}>{new Date(c.created_at).toLocaleDateString('fr-FR')}</td>
                        <td className={tdClass}>
                          <Link to={`/courriers/${c.id}`}>
                            <Button type="button" variant="secondary" size="sm">
                              Numériser
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
        </CardBody>
      </Card>
    </div>
  );
}
