import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useFocusTrap } from '../../hooks/useFocusTrap';

/**
 * Modale générique à contenu libre — même structure que ConfirmDialog.jsx
 * (overlay fixe, fermeture sur Échap et clic sur le fond) mais sans contenu
 * figé confirmer/annuler, pour héberger n'importe quel contenu (ex. la
 * prévisualisation de document, voir DocumentPreviewModal.jsx).
 */
export function Modal({ open, onClose, title, wide = false, children }) {
  const conteneurRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return;
    function surEchap(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', surEchap);
    return () => document.removeEventListener('keydown', surEchap);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={conteneurRef}
        className={`relative flex max-h-full w-full flex-col rounded-modal border border-border-strong bg-surface-raised shadow-raised ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 id="modal-title" className="font-heading text-section-title font-semibold text-text">
            {title}
          </h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}
