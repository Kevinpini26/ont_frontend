export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0 max-w-3xl">
        <div className="mb-2 h-1 w-10 rounded-full bg-ont-gold-400" aria-hidden="true" />
        <h1 className="font-heading text-page-title font-semibold tracking-tight text-text">{title}</h1>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-text-subtle">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2 pt-3">{action}</div>}
    </div>
  );
}
