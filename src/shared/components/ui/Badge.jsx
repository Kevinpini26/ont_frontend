const TONES = {
  neutral: 'bg-surface-sunken text-text-muted',
  info: 'bg-ont-blue-50 text-ont-blue-700 dark:bg-ont-blue-950 dark:text-ont-blue-300',
  success: 'bg-ont-green-50 text-ont-green-700 dark:bg-ont-green-900/40 dark:text-ont-green-300',
  warning: 'bg-ont-gold-100 text-ont-gold-800 dark:bg-ont-gold-900/40 dark:text-ont-gold-300',
  danger: 'bg-ont-red-500/10 text-ont-red-700 dark:bg-ont-red-500/20 dark:text-ont-red-300',
};

// Pastille devant le texte, en plus de la teinte : un statut reste
// distinguable sans dépendre uniquement de la couleur (daltonisme), même
// principe que ZoneAlertes/StatCard. Paliers vérifiés par calcul contre un
// fond clair ET sombre (3,0 minimum, seuil UI) : ont-gold-500 ne donnait
// que 1,65 sur blanc, ont-green-600 que 2,97 sur son propre bg-ont-green-50.
const PASTILLES = {
  neutral: 'bg-text-subtle',
  info: 'bg-ont-blue-500',
  success: 'bg-ont-green-700',
  warning: 'bg-ont-gold-700 dark:bg-ont-gold-500',
  danger: 'bg-ont-red-500',
};

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PASTILLES[tone]}`} aria-hidden="true" />
      {children}
    </span>
  );
}
