function Barre({ className = '' }) {
  return <div className={`animate-pulse rounded bg-border-strong ${className}`} />;
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-5">
          <div className="flex items-start gap-4">
            <Barre className="h-11 w-11 shrink-0 rounded-field" />
            <div className="flex-1 space-y-2">
              <Barre className="h-3 w-2/3" />
              <Barre className="h-6 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ hauteur = 'h-64' }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <Barre className="mb-4 h-4 w-1/3" />
      <Barre className={`${hauteur} w-full`} />
    </div>
  );
}

export function SkeletonTable({ lignes = 5 }) {
  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <Barre className="mb-4 h-4 w-1/4" />
      <div className="space-y-3">
        {Array.from({ length: lignes }).map((_, i) => (
          <Barre key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
