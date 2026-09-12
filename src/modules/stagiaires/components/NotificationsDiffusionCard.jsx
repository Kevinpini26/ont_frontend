import { useEffect, useState } from 'react';
import { getNotificationsDiffusion, renvoyerNotificationDiffusion } from '../api/stagiairesApi';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';

const TYPE_TONE = { retenu: 'success', non_retenu: 'danger' };
const TYPE_LABEL = { retenu: 'Retenu', non_retenu: 'Non retenu' };

/**
 * Historique des diffusions au candidat (Lot B) : append-only, chaque envoi
 * (initial ou renvoi) est sa propre ligne — jamais une mise à jour d'une
 * ligne existante. Permet à la DFP de répondre à un candidat qui affirme ne
 * pas avoir été prévenu, et de renvoyer sans ressaisir le message.
 */
export function NotificationsDiffusionCard({ stagiaireId }) {
  const [notifications, setNotifications] = useState(null);
  const [renvoiEnCours, setRenvoiEnCours] = useState(null);
  const [erreur, setErreur] = useState(null);

  async function charger() {
    setNotifications(await getNotificationsDiffusion(stagiaireId));
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stagiaireId]);

  if (notifications === null) return null;
  if (notifications.length === 0) return null;

  async function renvoyer(id) {
    setErreur(null);
    setRenvoiEnCours(id);
    try {
      await renvoyerNotificationDiffusion(id);
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'Renvoi impossible.');
    } finally {
      setRenvoiEnCours(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Notifications envoyées au candidat"
        description="Historique complet, y compris les renvois — utile en cas de contestation."
      />
      <CardBody className="space-y-3">
        {erreur && <p className="text-sm text-ont-red-700">{erreur}</p>}
        {notifications.map((n) => (
          <div key={n.id} className="flex items-start justify-between gap-3 rounded-field border border-border p-3 text-sm">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TYPE_TONE[n.type] ?? 'neutral'}>{TYPE_LABEL[n.type] ?? n.type}</Badge>
                <span className="text-xs text-text-subtle">{n.canal === 'email' ? 'E-mail' : 'SMS'}</span>
              </div>
              <p className="mt-1 truncate text-text-muted">{n.destinataire}</p>
              <p className="text-xs text-text-subtle">
                Envoyé le {n.envoye_at} {n.envoye_par ? `par ${n.envoye_par}` : ''}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={renvoiEnCours === n.id}
              onClick={() => renvoyer(n.id)}
            >
              {renvoiEnCours === n.id ? 'Envoi…' : 'Renvoyer'}
            </Button>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
