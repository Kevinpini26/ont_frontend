import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileClock } from 'lucide-react';
import { listStagiaires } from '../api/stagiairesApi';
import { marquerConsulte } from '../../kernel/api/notificationsApi';
import { useRequete } from '../../../shared/hooks/useRequete';
import { SearchBar } from '../../../shared/components/SearchBar';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field } from '../../../shared/components/ui/Field';
import { Badge } from '../../../shared/components/ui/Badge';
import { Pagination } from '../../../shared/components/ui/Pagination';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { TableWrap, tableClass, theadClass, thClass, tbodyClass, tdClass, trHoverClass } from '../../../shared/components/ui/Table';

/**
 * Dossiers pas encore affectés (dossier_recu, en_attente_affectation) : hors
 * périmètre de DfpStagiairesPage.jsx (réservée aux stages actifs), point
 * d'entrée dédié — les actions "Examiner le dossier"/"Affecter" restent sur
 * la fiche individuelle, déjà construites, pas dupliquées ici.
 */
export function DemandesStagePage() {
  const [recherche, setRecherche] = useState('');
  const [page, setPage] = useState(1);

  const { donnees: reponse, chargement } = useRequete(
    (signal) => {
      const params = { page, en_attente_traitement: 1 };
      if (recherche) params.recherche = recherche;
      return listStagiaires(params, signal);
    },
    [recherche, page],
  );
  const stagiaires = reponse?.data ?? [];
  const meta = reponse?.meta ?? null;

  useEffect(() => {
    setPage(1);
  }, [recherche]);

  useEffect(() => {
    marquerConsulte('demandes_stage');
  }, []);

  return (
    <div>
      <PageHeader title="Demandes de stage" description="Dossiers reçus, en attente d'affectation à une direction d'accueil." />

      <Card>
        <CardBody>
          <div className="mb-4 max-w-sm">
            <Field label="Recherche">
              <SearchBar value={recherche} onChange={setRecherche} placeholder="Nom ou numéro de dossier…" />
            </Field>
          </div>

          <p className="mb-4 text-sm text-text-subtle">
            {meta ? `${meta.total} résultat${meta.total > 1 ? 's' : ''}` : ''}
          </p>

          {chargement ? (
            <LoadingBlock />
          ) : stagiaires.length === 0 ? (
            <EmptyState icon={<FileClock size={32} />} title="Aucune demande en attente" description="Tous les dossiers reçus ont été traités." />
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}>Nom</th>
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Établissement</th>
                    <th className={thClass}>Référence</th>
                    <th className={thClass}>Statut</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {stagiaires.map((s) => (
                    <tr key={s.id} className={trHoverClass}>
                      <td className={`${tdClass} whitespace-nowrap font-medium text-text`}>{s.nom}</td>
                      <td className={tdClass}>
                        <Badge tone="neutral">{s.type_stage_label}</Badge>
                      </td>
                      <td className={`${tdClass} max-w-[14rem] truncate`} title={s.etablissement_origine}>{s.etablissement_origine}</td>
                      <td className={`${tdClass} whitespace-nowrap font-mono text-xs`}>{s.reference_courrier}</td>
                      <td className={tdClass}>
                        <Badge tone="warning">{s.statut_label}</Badge>
                      </td>
                      <td className={tdClass}>
                        <Link to={`/stagiaires/${s.id}`}>
                          <Button type="button" variant="secondary" size="sm">
                            Ouvrir
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
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
