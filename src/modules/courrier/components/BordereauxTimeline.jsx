import { CheckCircle2, Clock } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { formaterDateHeure } from '../utils/dateHeure';

/**
 * Fil chronologique des bordereaux de transmission : preuve de traçabilité
 * (qui a transmis, à qui, quand, et quand la décharge a été donnée) en cas
 * de contestation sur un délai de traitement. Reçoit `transitions` déjà
 * chargées avec la fiche (voir CourrierResource) — pas de fetch propre,
 * contrairement à AnnotationsPanel.
 */
export function BordereauxTimeline({ transitions }) {
  if (!transitions) return null;

  return (
    <Card>
      <CardHeader title="Historique des transitions et transmissions" description="Changements de statut, remises et décharges du dossier." />
      <CardBody>
        {transitions.length === 0 ? (
          <EmptyState title="Aucun bordereau pour le moment" />
        ) : (
          <ol className="relative ml-2 space-y-0 border-l border-border-strong">
            {transitions.map((t, index) => {
              const dateTransition = formaterDateHeure(t.created_at);
              const dateDecharge = formaterDateHeure(t.accuse_reception_at);

              return (
              <li key={index} className="relative ml-5 border-b border-border py-4 text-sm last:border-b-0 first:pt-0 last:pb-0">
                <span className="absolute -left-[1.72rem] top-5 h-3 w-3 rounded-full border-2 border-surface bg-ont-blue-500 ring-1 ring-border-strong first:top-1" aria-hidden="true" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-text">
                    <span className="font-medium">
                      {t.ancien_statut ? `${t.ancien_statut} → ${t.nouveau_statut}` : t.statut_label}
                    </span>
                    {t.destinataire ? ' — transmis par ' : ' — transition enregistrée par '}
                    <span className="font-medium">{t.emetteur ?? 'Guichet public'}</span>
                    {t.expediteur_poste && <span className="text-text-subtle"> ({t.expediteur_poste})</span>}
                    {t.destinataire && (
                      <>
                        {' → à l\'attention de '}
                        <span className="font-medium">{t.destinataire}</span>
                      </>
                    )}
                  </p>
                  {dateTransition && <span className="whitespace-nowrap text-xs text-text-subtle">{dateTransition}</span>}
                </div>

                {t.instruction && <p className="mt-2 text-text-subtle">Instruction : {t.instruction}</p>}

                {t.destinataire && (
                  <div className="mt-2">
                    {t.accuse_reception_at ? (
                      <Badge tone="success" className="inline-flex items-center gap-1">
                        <CheckCircle2 size={12} aria-hidden="true" />
                        Réception accusée par {t.accuse_reception_par}{dateDecharge && ` le ${dateDecharge}`}
                      </Badge>
                    ) : (
                      <Badge tone="warning" className="inline-flex items-center gap-1">
                        <Clock size={12} aria-hidden="true" />
                        En attente de décharge
                      </Badge>
                    )}
                  </div>
                )}
              </li>
              );
            })}
          </ol>
        )}
      </CardBody>
    </Card>
  );
}
