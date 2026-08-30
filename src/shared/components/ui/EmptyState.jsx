export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border-strong px-6 py-12 text-center">
      {icon && <div className="mb-1 text-3xl text-text-subtle">{icon}</div>}
      <p className="text-sm font-medium text-text-muted">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-subtle">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
