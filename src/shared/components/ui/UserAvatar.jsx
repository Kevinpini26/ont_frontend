const TAILLES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function initiales(nom = '') {
  return nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((partie) => partie.charAt(0))
    .join('')
    .toUpperCase() || 'ONT';
}

export function UserAvatar({ name, size = 'md', className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-white/20 bg-ont-blue-800 font-semibold tracking-wide text-white ${TAILLES[size]} ${className}`}
    >
      {initiales(name)}
    </span>
  );
}
