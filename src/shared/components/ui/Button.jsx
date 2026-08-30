const VARIANTS = {
  primary:
    'bg-ont-blue-700 text-white hover:bg-ont-blue-800 focus-visible:outline-ont-blue-700 disabled:bg-ont-blue-300 dark:bg-ont-blue-600 dark:hover:bg-ont-blue-500',
  // Réservée aux actions les plus engageantes de l'application (ex. signature
  // définitive d'un courrier) : l'or du logo attire l'œil sur ce qui ne se
  // refait pas, sans être la couleur par défaut de tous les boutons primaires.
  // Texte ont-blue-950, jamais blanc : blanc sur ont-gold-* ne dépasse jamais
  // 2,03 de contraste, quel que soit le palier.
  gold: 'bg-ont-gold-400 text-ont-blue-950 hover:bg-ont-gold-500 focus-visible:outline-ont-gold-600 disabled:bg-ont-gold-200 dark:bg-ont-gold-400 dark:hover:bg-ont-gold-500',
  secondary:
    'bg-surface text-text ring-1 ring-inset ring-border-strong hover:bg-surface-sunken focus-visible:outline-ont-blue-700 disabled:text-text-subtle',
  outline:
    'border border-ont-blue-700 bg-transparent text-ont-blue-700 hover:bg-ont-blue-50 focus-visible:outline-ont-blue-700 disabled:border-border-strong disabled:text-text-subtle dark:border-ont-blue-400 dark:text-ont-blue-300 dark:hover:bg-ont-blue-950',
  danger:
    'bg-ont-red-500 text-white hover:bg-ont-red-700 focus-visible:outline-ont-red-500 disabled:bg-ont-red-300',
  ghost: 'text-text-muted hover:bg-surface-sunken focus-visible:outline-ont-blue-700',
};

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-field font-medium shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:shadow-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}
