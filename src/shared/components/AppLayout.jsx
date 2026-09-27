import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ChevronRight, Menu, Search } from 'lucide-react';
import { useAuthStore } from '../../modules/kernel/store/authStore';
import { useSessionExpiryWatcher } from '../hooks/useSessionExpiryWatcher';
import { usePageTitle } from '../hooks/usePageTitle';
import { accueilDeSection } from '../navigation';
import { NotificationsBell } from './NotificationsBell';
import { Sidebar } from './Sidebar';
import { ThemeSelector } from './ThemeSelector';
import { UserMenu } from './UserMenu';
import { CommandPalette } from './CommandPalette';
import { RouteTransition } from './RouteTransition';
import { UserAvatar } from './ui/UserAvatar';

function FilDAriane({ user }) {
  const { section, label } = usePageTitle(user);
  const accueilSection = section ? accueilDeSection(section, user) : null;

  if (!label) return null;

  return (
    <div className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
      {section && (
        <>
          {accueilSection ? (
            <Link to={accueilSection} className="shrink-0 text-text-subtle hover:text-text">
              {section}
            </Link>
          ) : (
            <span className="shrink-0 text-text-subtle">{section}</span>
          )}
          <ChevronRight size={14} className="shrink-0 text-text-subtle" />
        </>
      )}
      <span aria-current="page" className="truncate font-medium text-text">
        {label}
      </span>
    </div>
  );
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const sessionExpireBientot = useSessionExpiryWatcher();

  function seDeconnecter() {
    logout();
    navigate('/connexion');
  }

  useEffect(() => {
    function surRaccourci(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setRechercheOuverte(true);
      }
    }
    document.addEventListener('keydown', surRaccourci);
    return () => document.removeEventListener('keydown', surRaccourci);
  }, []);

  if (!user) return <Outlet />;

  return (
    <div className="flex min-h-svh bg-surface-sunken">
      <Sidebar user={user} onLogout={seDeconnecter} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="app-workspace flex min-w-0 flex-1 flex-col">
        {sessionExpireBientot && (
          <div
            role="alert"
            className="flex items-center justify-center gap-3 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
          >
            <span>Votre session va bientôt expirer. Enregistrez votre travail en cours.</span>
            <button type="button" onClick={seDeconnecter} className="font-medium underline underline-offset-2">
              Se reconnecter maintenant
            </button>
          </div>
        )}

        {/* Pas de flou d'arrière-plan (contrairement à la maquette de départ) :
            une bordure basse nette suffit à détacher la barre du contenu qui
            défile dessous. */}
        <header className="sticky top-0 z-10 flex h-[68px] items-center gap-4 border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-field text-text-muted hover:bg-surface-sunken lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>

          <FilDAriane user={user} />

          <button
            type="button"
            onClick={() => setRechercheOuverte(true)}
            className="mx-auto flex h-10 w-full max-w-md items-center gap-2 rounded-field border border-border bg-surface-sunken px-3 text-sm text-text-subtle transition-colors hover:border-ont-blue-300 hover:bg-surface"
          >
            <Search size={15} className="shrink-0" />
            <span className="flex-1 text-left">Rechercher…</span>
            <kbd className="hidden shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 text-[11px] sm:block">Ctrl K</kbd>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-field border border-border bg-surface-sunken/70 p-0.5">
              <ThemeSelector />
              <NotificationsBell />
            </div>
            <UserMenu
              user={user}
              onLogout={seDeconnecter}
              trigger={<UserAvatar name={user.name} size="md" />}
            />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1520px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <RouteTransition>
            <Outlet />
          </RouteTransition>
        </main>
      </div>

      <CommandPalette open={rechercheOuverte} onClose={() => setRechercheOuverte(false)} />
    </div>
  );
}
