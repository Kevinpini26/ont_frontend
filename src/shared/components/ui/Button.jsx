const VARIANTS = {
  primary: 'bg-ont-blue-700 text-white hover:bg-ont-blue-800 disabled:bg-ont-blue-300 dark:bg-ont-blue-600 dark:hover:bg-ont-blue-500',
  // Réservée aux actions les plus engageantes de l'application (ex. signature
  // définitive d'un courrier) : l'or du logo attire l'œil sur ce qui ne se
  // refait pas, sans être la couleur par défaut de tous les boutons primaires.
  // Texte ont-blue-950, jamais blanc : blanc sur ont-gold-* ne dépasse jamais
  // 2,03 de contraste, quel que soit le palier.
  gold: 'bg-ont-gold-400 text-ont-blue-950 hover:bg-ont-gold-500 disabled:bg-ont-gold-200 dark:bg-ont-gold-400 dark:hover:bg-ont-gold-500',
  secondary: 'bg-surface text-text ring-1 ring-inset ring-border-strong hover:bg-surface-sunken disabled:text-text-subtle',
  outline:
    'border border-ont-blue-700 bg-transparent text-ont-blue-700 hover:bg-ont-blue-50 disabled:border-border-strong disabled:text-text-subtle dark:border-ont-blue-400 dark:text-ont-blue-300 dark:hover:bg-ont-blue-950',
  danger: 'bg-ont-red-500 text-white hover:bg-ont-red-700 disabled:bg-ont-red-300',
  ghost: 'text-text-muted hover:bg-surface-sunken',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
  // Carré, sans texte — voir aria-label obligatoire sur l'appelant (bouton
  // "Fermer" d'une modale, etc.).
  icon: 'p-2',
};

/**
 * `loading` : désactive le bouton et affiche un spineur à la place du
 * contenu — sans changer la largeur du bouton (le contenu original reste
 * en place, juste rendu invisible, le spineur est superposé par-dessus :
 * un bouton qui rétrécit pendant l'attente puis reprend sa taille au
 * résultat est plus perturbant qu'utile).
 */
export function Button({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }) {
  return (
    <button
      className={`relative inline-flex items-center justify-center gap-1.5 rounded-field font-medium shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ont-blue-500 disabled:cursor-not-allowed disabled:shadow-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        // SVG en ligne plutôt que le composant Spinner partagé : Spinner
        // fixe sa propre couleur (bleu), alors qu'ici le spineur doit
        // reprendre la couleur de texte de CE bouton précis (blanc sur
        // primary/danger, ont-blue-950 sur gold...) via currentColor, pas
        // une teinte fixe qui deviendrait illisible sur certaines variantes.
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </span>
      )}
      <span className={`inline-flex items-center gap-1.5 ${loading ? 'invisible' : ''}`}>{children}</span>
    </button>
  );
}
