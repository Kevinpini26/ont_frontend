import { Badge } from '../../../../shared/components/ui/Badge';

/**
 * Rail des bannettes — ~260px sur desktop large, repli en icônes avec
 * info-bulle en dessous de 1280px (correction #3, voir useLargeurEtroite).
 * Chaque bannette porte son compteur, jamais recalculé côté composant :
 * c'est l'appelant (PosteDeTravailTriPage) qui sait combien de dossiers
 * chaque bannette contient réellement.
 */
export function RailBannettes({ bannettes, actif, onSelect, etroit }) {
  return (
    <nav
      aria-label="Bannettes"
      className={`flex shrink-0 flex-col gap-1 border-r border-border bg-surface p-2 ${etroit ? 'w-16' : 'w-[260px] p-3'}`}
    >
      {bannettes.map((b) => {
        const estActif = b.id === actif;
        const Icone = b.icone;
        return (
          <button
            key={b.id}
            type="button"
            title={etroit ? b.label : undefined}
            aria-label={b.label}
            aria-current={estActif ? 'true' : undefined}
            onClick={() => onSelect(b.id)}
            className={`relative flex items-center gap-2.5 rounded-field px-3 py-2.5 text-left text-sm font-medium transition-colors ${
              etroit ? 'justify-center' : ''
            } ${
              estActif
                ? 'bg-ont-blue-50 text-ont-blue-800 dark:bg-ont-blue-950 dark:text-ont-blue-200'
                : 'text-text-muted hover:bg-surface-sunken'
            }`}
          >
            <Icone size={18} className="shrink-0" aria-hidden="true" />
            {etroit ? (
              b.compte > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ont-red-500 px-1 text-[10px] font-bold leading-none text-white"
                >
                  {b.compte > 99 ? '99+' : b.compte}
                </span>
              )
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate">{b.label}</span>
                {b.compte > 0 && <Badge tone={estActif ? 'info' : (b.tone ?? 'neutral')}>{b.compte}</Badge>}
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}
