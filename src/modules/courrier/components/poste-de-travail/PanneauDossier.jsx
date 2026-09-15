import { ExternalLink, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../../../shared/components/ui/Button';
import { EmptyState } from '../../../../shared/components/ui/EmptyState';

/**
 * Colonne de droite : résumé du dossier sélectionné (`children`, propre à
 * chaque écran de poste de travail) et barre d'actions numérotée (1-5, voir
 * useRaccourcisClavier dans la page appelante — ce composant affiche
 * seulement le numéro à côté de chaque bouton, il ne gère pas lui-même les
 * touches). `actions` : jusqu'à cinq { label, onTrigger, variant, disabled }.
 */
export function PanneauDossier({ dossier, actions = [], children }) {
  if (!dossier) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState icon={<FolderOpen size={28} />} title="Aucun dossier sélectionné" description="Choisissez un dossier dans la file à gauche (j/k ou flèches, puis Entrée)." />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="font-heading text-section-title font-semibold text-text">{dossier.numero_accuse_reception}</p>
          <p className="truncate text-sm text-text-muted">{dossier.objet}</p>
        </div>
        <Link to={`/courriers/${dossier.id}`}>
          <Button type="button" variant="ghost" size="sm">
            <ExternalLink size={15} />
            Fiche complète
          </Button>
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border bg-surface-sunken px-5 py-4">
          {actions.map((a, index) => (
            <Button
              key={a.label}
              type="button"
              variant={a.variant ?? 'secondary'}
              disabled={a.disabled}
              onClick={a.onTrigger}
              className="gap-2"
            >
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-black/10 text-xs font-bold dark:bg-white/15"
              >
                {index + 1}
              </span>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
