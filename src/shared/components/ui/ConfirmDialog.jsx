import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/**
 * Remplace window.confirm() : une boîte de dialogue native ne peut pas être
 * stylée (police système, pas de charte ONT) et bloque le thread — pas
 * acceptable pour une interface professionnelle. Toujours utilisée via
 * useConfirm(), jamais montée/pilotée à la main.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'primary',
  pending = false,
  onConfirm,
  onCancel,
}) {
  const conteneurRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    function surEchap(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', surEchap);
    return () => document.removeEventListener('keydown', surEchap);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div
        ref={conteneurRef}
        className="relative w-full max-w-sm rounded-modal border border-border-strong bg-surface-raised p-6 shadow-raised"
      >
        <div className="flex items-start gap-3">
          {tone === 'danger' && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ont-red-500/10 text-ont-red-700 dark:text-ont-red-300">
              <AlertTriangle size={20} />
            </div>
          )}
          <div className="min-w-0">
            <h3 id="confirm-dialog-title" className="font-heading text-section-title font-semibold text-text">
              {title}
            </h3>
            {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button type="button" variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={pending}>
            {pending ? 'Patientez…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
