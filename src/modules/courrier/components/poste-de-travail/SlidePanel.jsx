import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../../shared/components/ui/Button';
import { useFocusTrap } from '../../../../shared/hooks/useFocusTrap';

/**
 * Panneau latéral coulissant (180ms, voir index.css) — remplace une modale
 * centrée pour une action à saisie courte (degré d'urgence, motif, décision
 * rapide) : le dossier reste visible à côté plutôt que masqué derrière un
 * fondu plein écran (voir l'interdit du brief PosteDeTravail).
 *
 * `etroit` (voir useLargeurEtroite) décide du mode d'affichage — correction
 * #3 : au-dessus de 1280px le panneau partage l'espace du layout (une
 * colonne de plus, sans scrim, le document reste visible et interactif) ;
 * en dessous, il n'y a plus de place à comprimer, donc il se superpose en
 * position fixe avec un voile sur le document.
 */
export function SlidePanel({ open, onClose, title, etroit, largeur = 'w-[26rem]', children }) {
  const conteneurRef = useFocusTrap(open);

  useEffect(() => {
    if (!open) return undefined;
    function surEchap(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', surEchap);
    return () => document.removeEventListener('keydown', surEchap);
  }, [open, onClose]);

  if (!open) return null;

  const panneau = (
    <div
      ref={conteneurRef}
      role="dialog"
      aria-modal={etroit || undefined}
      aria-labelledby="panneau-lateral-titre"
      className={`flex h-full ${largeur} shrink-0 animate-entree-panneau-lateral flex-col border-l border-border-strong bg-surface-raised shadow-raised`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 id="panneau-lateral-titre" className="font-heading text-section-title font-semibold text-text">
          {title}
        </h3>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </div>
  );

  if (!etroit) {
    // Colonne supplémentaire dans le flux — voir PosteDeTravail.jsx, qui
    // réserve cet espace à même le layout flex plutôt qu'en position fixe.
    return panneau;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 animate-entree-fondu bg-black/45" onClick={onClose} aria-hidden="true" />
      <div className="relative h-full">{panneau}</div>
    </div>
  );
}
