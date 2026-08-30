export const inputClass =
  'block w-full rounded-field border-0 bg-surface px-3 py-2 text-sm text-text shadow-sm ring-1 ring-inset ring-border-strong placeholder:text-text-subtle focus:ring-2 focus:ring-inset focus:ring-ont-blue-600 disabled:bg-surface-sunken disabled:text-text-subtle dark:focus:ring-ont-blue-500';

export function Field({ label, htmlFor, hint, error, required, children }) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-text-muted">
          {label}
          {required && <span className="ml-0.5 text-ont-red-700 dark:text-ont-red-300">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-text-subtle">{hint}</p>}
      {error && <p className="mt-1 text-xs text-ont-red-700 dark:text-ont-red-300">{error}</p>}
    </div>
  );
}
