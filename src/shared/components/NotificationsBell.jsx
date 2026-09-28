import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../../modules/kernel/api/notificationsApi';

export function NotificationsBell() {
  const navigate = useNavigate();
  const [ouvert, setOuvert] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [nonLues, setNonLues] = useState(0);
  const conteneurRef = useRef(null);

  async function charger() {
    try {
      const { data, non_lues } = await listNotifications();
      setNotifications(data);
      setNonLues(non_lues);
    } catch {
      // silencieux : la cloche ne doit pas casser le reste de l'UI
    }
  }

  useEffect(() => {
    charger();
    const intervalle = setInterval(charger, 60000);
    return () => clearInterval(intervalle);
  }, []);

  useEffect(() => {
    function surClicExterieur(e) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) {
        setOuvert(false);
      }
    }
    document.addEventListener('mousedown', surClicExterieur);
    return () => document.removeEventListener('mousedown', surClicExterieur);
  }, []);

  useEffect(() => {
    if (!ouvert) return undefined;
    function surEchap(e) {
      if (e.key === 'Escape') setOuvert(false);
    }
    document.addEventListener('keydown', surEchap);
    return () => document.removeEventListener('keydown', surEchap);
  }, [ouvert]);

  async function ouvrirEtMarquerLu(notification) {
    if (!notification.read_at) {
      await markNotificationRead(notification.id);
      charger();
    }
    if (notification.data.lien) {
      setOuvert(false);
      navigate(notification.data.lien);
    }
  }

  return (
    <div className="relative" ref={conteneurRef}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-sunken"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={ouvert}
      >
        <Bell size={20} />
        {nonLues > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ont-red-500 px-1 text-[10px] font-semibold text-white">
            {nonLues}
          </span>
        )}
      </button>

      {/* Région vive discrète : annonce le nouveau total de non-lues aux
          lecteurs d'écran à chaque rechargement, sans dépendre de l'ouverture
          du menu (visuellement masquée, jamais affichée à l'écran). */}
      <span className="sr-only" role="status" aria-live="polite">
        {nonLues > 0 ? `${nonLues} notification${nonLues > 1 ? 's' : ''} non lue${nonLues > 1 ? 's' : ''}` : 'Aucune notification non lue'}
      </span>

      {ouvert && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-card border border-border-strong bg-surface-raised shadow-raised"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <strong className="text-sm text-text">Notifications</strong>
            {nonLues > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead().then(charger)}
                className="text-xs font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {notifications.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-text-subtle">Aucune notification.</p>
          )}

          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-border last:border-0">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => ouvrirEtMarquerLu(n)}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-surface-sunken ${
                    n.read_at ? 'text-text-subtle' : 'bg-ont-blue-50/60 font-medium text-text dark:bg-ont-blue-950/30'
                  }`}
                >
                  <p>{n.data.message}</p>
                  <time className="mt-0.5 block text-xs text-text-subtle">
                    {new Date(n.created_at).toLocaleString('fr-FR')}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
