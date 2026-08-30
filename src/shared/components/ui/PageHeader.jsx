export function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-heading text-xl font-semibold text-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}
