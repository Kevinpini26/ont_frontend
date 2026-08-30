import { useEffect, useState } from 'react';
import { listAuditLogs } from '../api/auditLogsApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Badge } from '../../../shared/components/ui/Badge';
import {
  TableWrap,
  tableClass,
  theadClass,
  thClass,
  thClassChiffre,
  tbodyClass,
  tdClass,
  trHoverClass,
  SkeletonRows,
} from '../../../shared/components/ui/Table';
import { ScrollText } from 'lucide-react';

const TONE_PAR_ACTION = {
  'auth.connexion': 'success',
  'auth.deconnexion': 'neutral',
  'auth.echec_connexion': 'danger',
  'courrier.signature': 'info',
  'stagiaire.affectation': 'info',
  'stagiaire.evaluation_direction': 'warning',
  'stagiaire.evaluation_dfp': 'warning',
};

export function AdminAuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    listAuditLogs()
      .then((data) => setLogs(data.data))
      .finally(() => setChargement(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Journal d'audit"
        description="Traçabilité des actions sensibles (connexions, signatures, affectations, notations) à des fins de litige."
      />

      <Card>
        <CardBody className="p-0">
          {!chargement && logs.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<ScrollText size={32} />} title="Aucune action journalisée pour le moment" />
            </div>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    {/* Première colonne ET colonne de date à la fois : gras
                        (ancrage de ligne) et tabular-nums (alignement des
                        horodatages), les deux conventions s'additionnent. */}
                    <th className={thClassChiffre}>Date</th>
                    <th className={thClass}>Action</th>
                    <th className={thClass}>Auteur</th>
                    <th className={thClass}>Détails</th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargement ? (
                    <SkeletonRows colonnes={4} />
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className={trHoverClass}>
                        <td className="whitespace-nowrap px-4 py-3 text-right align-middle font-semibold tabular-nums text-text">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </td>
                        <td className={tdClass}>
                          <Badge tone={TONE_PAR_ACTION[log.action] ?? 'neutral'}>{log.action}</Badge>
                        </td>
                        <td className={tdClass}>{log.auteur?.name ?? '—'}</td>
                        <td className={`${tdClass} max-w-md truncate`} title={log.description ?? JSON.stringify(log.meta ?? {})}>
                          {log.description ?? (log.meta ? JSON.stringify(log.meta) : '—')}
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
