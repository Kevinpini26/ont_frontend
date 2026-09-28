import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { navigationForUser } from '../navigation';
import { OntLogo } from './ui/OntLogo';
import { UserMenu } from './UserMenu';
import { useSidebarCounts } from '../hooks/useSidebarCounts';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { UserAvatar } from './ui/UserAvatar';
import { useDgAutorite } from '../../modules/kernel/hooks/useDgAutorite';

const BADGE_TONES = {
  danger: 'bg-ont-red-500 text-white',
  // Jamais de texte blanc sur l'or (2,03 de contraste au mieux) — voir Button/StatCard.
  warning: 'bg-ont-gold-400 text-ont-blue-950',
};

const CLE_REPLI = 'ont-sidebar-repliee';

/**
 * Ne pulse que sur l'arrivée d'une valeur PLUS GRANDE que la précédente
 * (une nouvelle demande, pas un dossier traité qui fait baisser un
 * compteur) — et seulement 3 battements (voir .animate-pulse-badge dans
 * index.css), jamais en continu. Remonter le <span> via sa `key` à chaque
 * arrivée rejoue l'animation CSS à itération bornée.
 */
function BadgeCompteur({ compteur }) {
  const [pulseKey, setPulseKey] = useState(0);
  const precedent = useRef(undefined);

  useEffect(() => {
    const avant = precedent.current;
    precedent.current = compteur?.count;
    if (avant !== undefined && compteur?.count > avant) {
      setPulseKey((k) => k + 1);
    }
  }, [compteur?.count]);

  if (!compteur || compteur.count <= 0) return null;

  return (
    <span
      key={pulseKey}
      className={`ml-auto inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold animate-pulse-badge ${BADGE_TONES[compteur.tone] ?? BADGE_TONES.warning}`}
    >
      {compteur.count > 99 ? '99+' : compteur.count}
    </span>
  );
}

export function Sidebar({ user, onLogout, mobileOpen, onCloseMobile }) {
  const sourceAutoriteDg = useDgAutorite(user?.poste === 'dga' || user?.poste_delegue === 'dg');
  const sections = navigationForUser({ ...user, poste_delegue: sourceAutoriteDg ? 'dg' : null });
  const compteurs = useSidebarCounts(user);
  const tiroirRef = useFocusTrap(mobileOpen);
  const { pathname } = useLocation();
  const [repliee, setRepliee] = useState(() => {
    try {
      return localStorage.getItem(CLE_REPLI) === '1';
    } catch {
      return false;
    }
  });
  const navRef = useRef(null);
  const activeRef = useRef(null);
  const [railStyle, setRailStyle] = useState({ opacity: 0 });

  useEffect(() => {
    try {
      localStorage.setItem(CLE_REPLI, repliee ? '1' : '0');
    } catch {
      // Stockage indisponible (navigation privée) : le repli reste actif pour
      // la session en cours, simplement pas mémorisé d'une visite à l'autre.
    }
  }, [repliee]);

  useLayoutEffect(() => {
    if (activeRef.current && navRef.current) {
      const itemRect = activeRef.current.getBoundingClientRect();
      const navRect = navRef.current.getBoundingClientRect();
      setRailStyle({ top: itemRect.top - navRect.top, height: itemRect.height, opacity: 1 });
    } else {
      setRailStyle((s) => ({ ...s, opacity: 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, repliee]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    function surEchap(e) {
      if (e.key === 'Escape') onCloseMobile();
    }
    document.addEventListener('keydown', surEchap);
    return () => document.removeEventListener('keydown', surEchap);
  }, [mobileOpen, onCloseMobile]);

  function contenu(pliable) {
    const plie = pliable && repliee;

    return (
      <div className="flex h-full flex-col">
        <div className={`flex min-h-[84px] items-center gap-3 border-b border-white/10 ${plie ? 'justify-center px-3' : 'px-5'}`}>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-white p-1 shadow-sm">
            <OntLogo className="h-9 w-9" />
          </span>
          {!plie && (
            <div className="min-w-0">
              <p className="font-heading text-[13px] font-semibold uppercase leading-tight tracking-[0.04em] text-white">Office National</p>
              <p className="font-heading text-[13px] font-semibold uppercase leading-tight tracking-[0.04em] text-white">du Tourisme</p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-ont-gold-300">R. D. Congo</p>
            </div>
          )}
        </div>

        <nav ref={navRef} className="relative flex-1 overflow-y-auto px-3 py-5">
          <span
            aria-hidden="true"
            className="absolute left-0 w-1 rounded-r-full bg-ont-gold-400 transition-[top,height] duration-150 ease-out"
            style={railStyle}
          />

          {sections.map((section, index) => (
            <div key={section.title} className={`pb-3 pt-3 first:pt-0 ${index > 0 ? 'border-t border-ont-blue-900/50' : ''}`}>
              {!plie && (
                <p className="mb-2 px-2 text-2xs font-semibold uppercase tracking-[0.14em] text-ont-blue-300/80">{section.title}</p>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <li key={item.to} ref={active ? activeRef : undefined}>
                      <NavLink
                        to={item.to}
                        onClick={onCloseMobile}
                        title={plie ? item.label : undefined}
                        aria-label={plie ? item.label : undefined}
                        className={`flex min-h-10 items-center gap-3 rounded-field px-3 py-2 text-sm font-medium transition-colors ${plie ? 'justify-center' : 'min-w-0'} ${
                          active ? 'bg-white/10 text-white ring-1 ring-inset ring-white/10' : 'text-blue-100/85 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <item.icon size={18} strokeWidth={active ? 2.2 : 1.8} className={active ? 'shrink-0 text-ont-gold-300' : 'shrink-0'} />
                        {!plie && <span className="truncate">{item.label}</span>}
                        {!plie && item.countKey && <BadgeCompteur compteur={compteurs[item.countKey]} />}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={`border-t border-ont-blue-900 py-4 ${plie ? 'px-3' : 'px-4'}`}>
          <UserMenu
            user={user}
            onLogout={onLogout}
            align="left"
            panelClassName="bottom-full mb-2"
            trigger={
              plie ? (
                <UserAvatar name={user.name} size="md" className="hover:bg-ont-blue-700" />
              ) : (
                <span className="flex w-full items-center gap-2.5 rounded-field px-1 py-1 text-left hover:bg-ont-blue-900">
                  <UserAvatar name={user.name} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">{user.name}</span>
                    <span className="block truncate text-xs text-ont-blue-300">{user.role_label}</span>
                  </span>
                </span>
              )
            }
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar fixe (desktop) — fond ont-blue foncé + texte clair : reste
          plus lisible qu'un fond clair vu la densité de la nav et cohérent
          avec le reste de l'interface, majoritairement en thème sombre. */}
      <aside className={`relative hidden shrink-0 bg-[#071e36] transition-[width] duration-150 lg:block ${repliee ? 'w-18' : 'w-[272px]'}`}>
        <div className={`fixed h-svh border-r border-white/5 bg-[#071e36] transition-[width] duration-150 ${repliee ? 'w-18' : 'w-[272px]'}`}>{contenu(true)}</div>

        <button
          type="button"
          onClick={() => setRepliee((v) => !v)}
          title={repliee ? 'Déplier la navigation' : 'Replier la navigation'}
          aria-label={repliee ? 'Déplier la navigation' : 'Replier la navigation'}
          className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-ont-blue-800 bg-ont-blue-900 text-ont-blue-100 hover:bg-ont-blue-800 hover:text-white lg:flex"
        >
          {repliee ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Tiroir mobile — jamais replié : sur petit écran, l'espace économisé
          par le mode compact n'a pas de valeur, autant garder les libellés. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside
            ref={tiroirRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="absolute inset-y-0 left-0 w-[272px] bg-[#071e36] shadow-raised"
          >
            {contenu(false)}
          </aside>
        </div>
      )}
    </>
  );
}
