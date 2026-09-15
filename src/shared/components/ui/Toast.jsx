import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

const TONES = {
  info: { icone: Info, classe: 'bg-ont-blue-50 text-ont-blue-800 ring-ont-blue-200 dark:bg-ont-blue-950/80 dark:text-ont-blue-200 dark:ring-ont-blue-900' },
  success: {
    icone: CheckCircle2,
    classe: 'bg-ont-green-50 text-ont-green-800 ring-ont-green-200 dark:bg-ont-green-900/80 dark:text-ont-green-200 dark:ring-ont-green-800',
  },
  warning: {
    icone: AlertTriangle,
    classe: 'bg-ont-gold-100 text-ont-gold-900 ring-ont-gold-300 dark:bg-ont-gold-900/60 dark:text-ont-gold-200 dark:ring-ont-gold-800',
  },
  // ont-red n'a que les paliers 300/500/700 dans la charte (jamais un
  // accent, réservé aux erreurs) — même convention que Badge/Alert, pas de
  // palier 50/200/800/950 inexistant.
  error: {
    icone: XCircle,
    classe: 'bg-ont-red-500/10 text-ont-red-700 ring-ont-red-500/20 dark:bg-ont-red-500/15 dark:text-ont-red-300 dark:ring-ont-red-500/25',
  },
};

/**
 * `const toast = useToast(); toast.success('Enregistré');` — confirmation
 * d'action non bloquante, à l'opposé de ConfirmDialog (qui interrompt et
 * attend une réponse) : un accusé de réception qu'on peut ignorer et qui
 * disparaît de lui-même.
 */
export function useToast() {
  const push = useToastStore((s) => s.push);
  const pousserDiffere = useToastStore((s) => s.pousserDiffere);
  return {
    info: useCallback((message, options) => push({ tone: 'info', message, ...options }), [push]),
    success: useCallback((message, options) => push({ tone: 'success', message, ...options }), [push]),
    warning: useCallback((message, options) => push({ tone: 'warning', message, ...options }), [push]),
    error: useCallback((message, options) => push({ tone: 'error', message, duree: 6000, ...options }), [push]),
    /**
     * Toast à Annuler réel — voir toastStore.pousserDiffere : `executer` ne
     * part que si `annulerDiffere` (le bouton "Annuler" rendu par
     * ToastContainer) n'a pas été actionné avant l'expiration. Réservé aux
     * actions réversibles — jamais la signature, le feu vert ou une
     * suppression (confirmation explicite, sans Annuler).
     */
    differe: useCallback((message, options) => pousserDiffere({ tone: 'info', message, ...options }), [pousserDiffere]),
  };
}

/**
 * Monté une seule fois (voir AppLayout.jsx) — empile les notifications en
 * bas à droite, la plus récente en dernier. `aria-live="polite"` : annoncé
 * aux lecteurs d'écran sans interrompre ce qui est en cours de lecture,
 * contrairement à une alerte modale. Vide aussi la file d'actions différées
 * (voir toastStore.viderActionsDifferees) sur beforeunload (fermeture/
 * rechargement d'onglet — voir httpBeacon.js pour pourquoi keepalive plutôt
 * que sendBeacon) et à chaque navigation interne (changement de route) :
 * une action différée ne doit jamais rester en suspens plus longtemps que
 * l'écran qui l'a annoncée.
 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const retirer = useToastStore((s) => s.retirer);
  const annulerDiffere = useToastStore((s) => s.annulerDiffere);
  const viderActionsDifferees = useToastStore((s) => s.viderActionsDifferees);
  const location = useLocation();

  useEffect(() => {
    function surFermeture() {
      useToastStore.getState().viderActionsDifferees();
    }
    window.addEventListener('beforeunload', surFermeture);
    return () => window.removeEventListener('beforeunload', surFermeture);
  }, []);

  const premierRendu = useRef(true);
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    viderActionsDifferees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => {
        const { icone: Icone, classe } = TONES[t.tone] ?? TONES.info;
        return (
          <div
            key={t.id}
            role="status"
            className={`animate-entree-toast pointer-events-auto flex items-start gap-2.5 rounded-card px-4 py-3 text-sm shadow-raised ring-1 ring-inset ${classe}`}
          >
            <Icone size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 break-words">{t.message}</p>
            {t.annulable && (
              <button
                type="button"
                onClick={() => annulerDiffere(t.id)}
                className="shrink-0 rounded-field px-2 py-0.5 text-xs font-semibold underline decoration-2 underline-offset-2 hover:no-underline"
              >
                Annuler
              </button>
            )}
            <button
              type="button"
              onClick={() => retirer(t.id)}
              aria-label="Fermer la notification"
              className="shrink-0 rounded-full p-0.5 opacity-70 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
