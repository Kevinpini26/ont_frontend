import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

const OPTIONS = [
  { value: 'light', label: 'Thème clair', Icon: Sun },
  { value: 'dark', label: 'Thème sombre', Icon: Moon },
  { value: 'system', label: 'Suivre le système', Icon: Monitor },
];

/**
 * Jamais rendu sur le portail public (verrouillé en thème clair par charte
 * graphique, voir useThemeSync/PUBLIC_LIGHT_PATHS) — ce composant n'est
 * monté que dans l'en-tête de l'espace applicatif interne (AppLayout).
 */
export function ThemeSelector() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div role="radiogroup" aria-label="Thème de l'interface" className="inline-flex rounded-field border border-border bg-surface p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={`flex h-7 w-7 items-center justify-center rounded-field transition-colors ${
            theme === value ? 'bg-ont-blue-700 text-white' : 'text-text-muted hover:bg-surface-sunken'
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
