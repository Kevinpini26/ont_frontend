import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../../modules/kernel/store/authStore';
import { useSessionExpiryWatcher } from '../hooks/useSessionExpiryWatcher';
import { NotificationsBell } from './NotificationsBell';
import { Sidebar } from './Sidebar';
import { ThemeSelector } from './ThemeSelector';

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sessionExpireBientot = useSessionExpiryWatcher();

  function seDeconnecter() {
    logout();
    navigate('/connexion');
  }

  if (!user) return <Outlet />;

  return (
    <div className="flex min-h-svh bg-surface-sunken">
      <Sidebar user={user} onLogout={seDeconnecter} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
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

        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur lg:justify-end">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-field text-text-muted hover:bg-surface-sunken lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <ThemeSelector />
            <NotificationsBell />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
