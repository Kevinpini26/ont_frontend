import { Inbox } from 'lucide-react';

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border-strong bg-surface-sunken/35 px-5 py-8 text-center">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-field border border-border bg-surface text-text-subtle">
        {icon ?? <Inbox size={17} aria-hidden="true" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-text-muted">{title}</p>
        {description && <p className="mt-1 max-w-sm text-xs leading-relaxed text-text-subtle">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
