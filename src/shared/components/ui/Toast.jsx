import { useCallback } from 'react';
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
  error: { icone: XCircle, classe: 'bg-ont-red-50 text-ont-red-800 ring-ont-red-200 dark:bg-ont-red-950/80 dark:text-ont-red-200 dark:ring-ont-red-900' },
};

/**
 * `const toast = useToast(); toast.success('Enregistré');` — confirmation
 * d'action non bloquante, à l'opposé de ConfirmDialog (qui interrompt et
 * attend une réponse) : un accusé de réception qu'on peut ignorer et qui
 * disparaît de lui-même.
 */
export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    info: useCallback((message, options) => push({ tone: 'info', message, ...options }), [push]),
    success: useCallback((message, options) => push({ tone: 'success', message, ...options }), [push]),
    warning: useCallback((message, options) => push({ tone: 'warning', message, ...options }), [push]),
    error: useCallback((message, options) => push({ tone: 'error', message, duree: 6000, ...options }), [push]),
  };
}

/**
 * Monté une seule fois (voir AppLayout.jsx) — empile les notifications en
 * bas à droite, la plus récente en dernier. `aria-live="polite"` : annoncé
 * aux lecteurs d'écran sans interrompre ce qui est en cours de lecture,
 * contrairement à une alerte modale.
 */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const retirer = useToastStore((s) => s.retirer);

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
