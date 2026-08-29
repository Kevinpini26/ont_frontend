import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../../modules/kernel/store/authStore';
import { useSessionExpiryWatcher } from '../hooks/useSessionExpiryWatcher';
import { NotificationsBell } from './NotificationsBell';
import { Sidebar } from './Sidebar';

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
    <div className="flex min-h-svh bg-slate-100 dark:bg-slate-950">
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

        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:justify-end">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
          <NotificationsBell />
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
