const OPTIONS = [
  { value: '7j', label: '7 derniers jours' },
  { value: '30j', label: '30 derniers jours' },
  { value: 'annee', label: 'Cette année' },
];

export function PeriodSelector({ value, onChange }) {
  return (
    <div className="inline-flex rounded-field border border-border bg-surface p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-field px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.value ? 'bg-ont-blue-700 text-white' : 'text-text-muted hover:bg-surface-sunken'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
