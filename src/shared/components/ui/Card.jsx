export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-card border border-border bg-surface ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 ${className}`}>
      <div>
        <h3 className="font-heading text-section-title font-semibold text-text">{title}</h3>
        {description && <p className="mt-0.5 text-label text-text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className = '', children }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
