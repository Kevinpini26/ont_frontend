export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-card border border-border bg-surface shadow-[0_1px_2px_rgb(15_23_42/0.025)] ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4 ${className}`}>
      <div>
        <h3 className="font-heading text-section-title font-semibold tracking-tight text-text">{title}</h3>
        {description && <p className="mt-1 max-w-2xl text-label leading-relaxed text-text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className = '', children }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
