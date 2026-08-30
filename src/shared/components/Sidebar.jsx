import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { navigationForUser } from '../navigation';
import { ROLE_LABELS, POSTE_LABELS } from '../../modules/kernel/constants';
import { OntLogo } from './ui/OntLogo';
import { useSidebarCounts } from '../hooks/useSidebarCounts';
import { useFocusTrap } from '../hooks/useFocusTrap';

const BADGE_TONES = {
  danger: 'bg-ont-red-500 text-white',
  warning: 'bg-ont-gold-500 text-white',
};

function BadgeCompteur({ compteur }) {
  if (!compteur || compteur.count <= 0) return null;

  return (
    <span
      className={`ml-auto inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold animate-pulse-badge ${BADGE_TONES[compteur.tone] ?? BADGE_TONES.warning}`}
    >
      {compteur.count > 99 ? '99+' : compteur.count}
    </span>
  );
}

export function Sidebar({ user, onLogout, mobileOpen, onCloseMobile }) {
  const sections = navigationForUser(user);
  const compteurs = useSidebarCounts(user);
  const tiroirRef = useFocusTrap(mobileOpen);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    function surEchap(e) {
      if (e.key === 'Escape') onCloseMobile();
    }
    document.addEventListener('keydown', surEchap);
    return () => document.removeEventListener('keydown', surEchap);
  }, [mobileOpen, onCloseMobile]);

  const contenu = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 border-b border-ont-blue-900 px-5 py-5">
        <OntLogo className="h-10 w-10 shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold text-white">Office National du Tourisme</p>
          <p className="text-xs text-ont-blue-300">Système d'information</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, index) => (
          <div key={section.title} className={`pb-3 pt-3 first:pt-0 ${index > 0 ? 'border-t border-ont-blue-900/50' : ''}`}>
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-ont-blue-400">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-field px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-ont-blue-700 text-white'
                          : 'text-ont-blue-100 hover:bg-ont-blue-900 hover:text-white'
                      }`
                    }
                  >
                    <item.icon size={20} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.countKey && <BadgeCompteur compteur={compteurs[item.countKey]} />}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-ont-blue-900 px-4 py-4">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-ont-blue-300">
          {ROLE_LABELS[user.role]}
          {user.poste ? ` · ${POSTE_LABELS[user.poste]}` : ''}
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-field px-3 py-2 text-sm font-medium text-ont-blue-100 hover:bg-ont-blue-900 hover:text-white"
        >
          <LogOut size={20} />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar fixe (desktop) — fond ont-blue foncé + texte clair : reste
          plus lisible qu'un fond clair vu la densité de la nav et cohérent
          avec le reste de l'interface, majoritairement en thème sombre. */}
      <aside className="hidden w-64 shrink-0 bg-ont-blue-950 lg:block">
        <div className="fixed h-svh w-64">{contenu}</div>
      </aside>

      {/* Tiroir mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside
            ref={tiroirRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="absolute inset-y-0 left-0 w-64 bg-ont-blue-950 shadow-raised"
          >
            {contenu}
          </aside>
        </div>
      )}
    </>
  );
}
