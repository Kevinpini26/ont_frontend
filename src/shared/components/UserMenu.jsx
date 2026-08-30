import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { ROLE_LABELS, POSTE_LABELS } from '../../modules/kernel/constants';
import { useThemeStore } from '../store/themeStore';

const OPTIONS_THEME = [
  { value: 'light', label: 'Clair', Icon: Sun },
  { value: 'dark', label: 'Sombre', Icon: Moon },
  { value: 'system', label: 'Système', Icon: Monitor },
];

/**
 * Menu du compte — remplace l'ancien bloc profil + bouton de déconnexion nu.
 * Monté à deux endroits (bas de la sidebar, avatar de l'en-tête sur mobile
 * quand la sidebar est repliée dans son tiroir) ; `align` place le panneau
 * du bon côté du déclencheur dans chaque cas.
 */
export function UserMenu({ user, onLogout, trigger, align = 'right', panelClassName = '' }) {
  const [ouvert, setOuvert] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const conteneurRef = useRef(null);

  useEffect(() => {
    function surClicExterieur(e) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) setOuvert(false);
    }
    document.addEventListener('mousedown', surClicExterieur);
    return () => document.removeEventListener('mousedown', surClicExterieur);
  }, []);

  useEffect(() => {
    if (!ouvert) return undefined;
    function surEchap(e) {
      if (e.key === 'Escape') setOuvert(false);
    }
    document.addEventListener('keydown', surEchap);
    return () => document.removeEventListener('keydown', surEchap);
  }, [ouvert]);

  return (
    <div className="relative" ref={conteneurRef}>
      <button type="button" onClick={() => setOuvert((v) => !v)} aria-haspopup="true" aria-expanded={ouvert} aria-label="Menu du compte">
        {trigger}
      </button>

      {ouvert && (
        <div
          role="menu"
          aria-label="Compte"
          className={`absolute z-20 mt-2 w-64 overflow-hidden rounded-card border border-border-strong bg-surface-raised shadow-raised ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${panelClassName}`}
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-text">{user.name}</p>
            <p className="truncate text-xs text-text-subtle">
              {ROLE_LABELS[user.role]}
              {user.poste ? ` · ${POSTE_LABELS[user.poste]}` : ''}
            </p>
          </div>

          <Link
            to="/changer-mot-de-passe"
            role="menuitem"
            onClick={() => setOuvert(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-surface-sunken"
          >
            <KeyRound size={16} className="text-text-subtle" />
            Changer le mot de passe
          </Link>

          <div className="px-4 py-2.5">
            <p className="mb-1.5 text-2xs font-semibold uppercase tracking-[0.08em] text-text-subtle">Thème</p>
            <div role="radiogroup" aria-label="Thème de l'interface" className="inline-flex rounded-field border border-border bg-surface-sunken p-1">
              {OPTIONS_THEME.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={theme === value}
                  aria-label={label}
                  title={label}
                  onClick={() => setTheme(value)}
                  className={`flex h-7 w-7 items-center justify-center rounded-field transition-colors ${
                    theme === value ? 'bg-ont-blue-700 text-white' : 'text-text-muted hover:bg-surface'
                  }`}
                >
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 border-t border-border px-4 py-2.5 text-left text-sm text-text hover:bg-surface-sunken"
          >
            <LogOut size={16} className="text-text-subtle" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
