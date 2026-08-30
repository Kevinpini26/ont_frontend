import { AntilopeSilhouette } from './AntilopeSilhouette';

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-card border border-dashed border-border-strong px-6 py-12 text-center">
      <AntilopeSilhouette className="pointer-events-none absolute inset-0 m-auto h-40 w-40 text-text-subtle opacity-[0.08]" />
      <div className="relative">
        {icon && <div className="mb-1 text-3xl text-text-subtle">{icon}</div>}
        <p className="text-sm font-medium text-text-muted">{title}</p>
        {description && <p className="max-w-sm text-sm text-text-subtle">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
