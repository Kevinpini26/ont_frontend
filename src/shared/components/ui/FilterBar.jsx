import { ListFilter } from 'lucide-react';

export function FilterBar({ children, className = '' }) {
  return (
    <div className={`mb-4 flex flex-wrap items-end gap-3 rounded-field border border-border bg-surface-sunken/55 px-3 py-3 ${className}`}>
      <span className="mb-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-field border border-border bg-surface text-text-subtle" aria-hidden="true">
        <ListFilter size={16} />
      </span>
      {children}
    </div>
  );
}
