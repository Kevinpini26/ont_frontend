import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

/**
 * Layout du site public (navbar + pied de page) — strictement indépendant
 * d'AppLayout/Sidebar (espace applicatif authentifié) : aucun composant de
 * l'un ne doit apparaître dans l'autre. Toujours en thème clair, quel que
 * soit le thème système (charte graphique du portail public).
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-surface">
      <PublicNavbar />
      <main className="flex-1 pt-20">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
