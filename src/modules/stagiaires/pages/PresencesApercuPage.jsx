import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck } from 'lucide-react';
import { listStagiaires } from '../api/stagiairesApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Pagination } from '../../../shared/components/ui/Pagination';
import {
  TableWrap,
  tableClass,
  theadClass,
  thClass,
  thClassChiffre,
  tbodyClass,
  tdClass,
  tdClassPremiere,
  tdClassChiffre,
  trHoverClass,
  SkeletonRows,
} from '../../../shared/components/ui/Table';

/**
 * Entrée dédiée "Présences" de la sidebar : aperçu en un coup d'œil de la
 * régularité des stagiaires actuellement en stage, avec un lien vers le
 * calendrier détaillé de chacun (sur sa fiche individuelle — voir
 * CalendrierPresences.jsx, pas dupliqué ici).
 */
export function PresencesApercuPage() {
  const [stagiaires, setStagiaires] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    setChargement(true);
    listStagiaires({ en_cours: 1, avec_assiduite: 1, page })
      .then(({ data, meta: metaPage }) => {
        setStagiaires(data);
        setMeta(metaPage);
      })
      .finally(() => setChargement(false));
  }, [page]);

  return (
    <div>
      <PageHeader title="Présences" description="Régularité des stagiaires actuellement en stage." />

      <Card>
        <CardBody>
          {!chargement && stagiaires.length === 0 ? (
            <EmptyState icon={<CalendarCheck size={32} />} title="Aucun stagiaire en cours" />
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Nom</th>
                    <th className={thClass}>Direction</th>
                    <th className={thClassChiffre}>Régularité</th>
                    <th className={thClassChiffre}>Ponctualité</th>
                    <th className={thClass}>Détail</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargement ? (
                    <SkeletonRows colonnes={6} />
                  ) : (
                    stagiaires.map((s) => {
                      const suggestion = s.assiduite_suggestion;
                      const regulariteFaible = suggestion && suggestion.regularite < 3;
                      return (
                        <tr key={s.id} className={trHoverClass}>
                          <td className={`${tdClassPremiere} whitespace-nowrap`}>{s.nom}</td>
                          <td className={tdClass}>{s.direction?.code ?? '—'}</td>
                          <td className={tdClassChiffre}>
                            {suggestion ? (
                              <Badge tone={regulariteFaible ? 'danger' : 'success'}>{suggestion.regularite} / 5</Badge>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className={tdClassChiffre}>{suggestion ? `${suggestion.ponctualite} / 5` : '—'}</td>
                          <td className={`${tdClass} max-w-[20rem] truncate text-xs text-text-subtle`} title={suggestion?.detail}>
                            {suggestion?.detail ?? '—'}
                          </td>
                          <td className={tdClass}>
                            <Link to={`/stagiaires/${s.id}`}>
                              <Button type="button" variant="secondary" size="sm">
                                Ouvrir
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })
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
