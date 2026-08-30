export function Spinner({ className = '' }) {
  return (
    <svg
      className={`animate-spin text-ont-blue-600 dark:text-ont-blue-400 ${className}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function LoadingBlock({ label = 'Chargement…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-subtle">
      <Spinner />
      {label}
    </div>
  );
}
