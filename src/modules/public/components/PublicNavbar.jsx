import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import { OntLogo } from '../../../shared/components/ui/OntLogo';
import { Button } from '../../../shared/components/ui/Button';
import { useScrolled } from '../hooks/useScrolled';

const LIENS = [
  { label: 'Accueil', to: '/' },
  { label: 'À propos', to: '/a-propos' },
  { label: 'Services', to: '/services' },
];

const lienClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'text-ont-blue-700' : 'text-text-muted hover:text-ont-blue-700'
  }`;

/**
 * Navbar du site public : TOUJOURS sur fond `surface` opaque, jamais
 * transparente — la section d'accueil est elle-même sur fond clair (voir
 * HomePage.jsx), un texte de navigation transparent y deviendrait
 * invisible. `useScrolled` pilote uniquement l'apparition de la bordure
 * basse et d'une ombre légère au premier défilement, jamais l'opacité du
 * fond. Le portail public reste toujours en thème clair (charte
 * graphique) : ce composant n'utilise donc volontairement aucune variante
 * dark:.
 */
export function PublicNavbar() {
  const scrolled = useScrolled();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b bg-surface transition-shadow duration-300 ${
        scrolled ? 'border-border shadow-sm' : 'border-transparent'
      }`}
    >
      <div
        className={`mx-auto flex w-full max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-6 lg:px-8 ${
          scrolled ? 'h-14' : 'h-20'
        }`}
      >
        <Link to="/" className="flex min-w-0 items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <OntLogo className="h-9 w-9 shrink-0" />
          <span className="font-heading text-sm leading-tight font-semibold text-text">
            Office National
            <br />
            du Tourisme
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LIENS.map((lien) => (
            <NavLink key={lien.to} to={lien.to} end={lien.to === '/'} className={lienClass}>
              {lien.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/suivi-dossier" className="hidden lg:inline-flex">
            <Button type="button" variant="secondary" size="sm">
              Suivre mon dossier
            </Button>
          </Link>
          <Link to="/demande-de-stage" className="hidden lg:inline-flex">
            <Button type="button" size="sm" className="gap-1.5">
              Déposer une demande
              <ArrowRight size={14} />
            </Button>
          </Link>
          {/* Discret, jamais une action principale de ce portail (réservé au personnel) — voir Lot 1 du prompt de refonte. */}
          <Link
            to="/connexion"
            className="hidden px-2 text-sm font-medium text-text-subtle hover:text-ont-blue-700 sm:inline-flex"
          >
            Espace personnel
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunken lg:hidden"
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border bg-surface px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {LIENS.map((lien) => (
              <NavLink key={lien.to} to={lien.to} end={lien.to === '/'} onClick={() => setMobileOpen(false)} className={lienClass}>
                {lien.label}
              </NavLink>
            ))}
            <Link to="/suivi-dossier" onClick={() => setMobileOpen(false)} className="mt-2">
              <Button type="button" variant="secondary" className="w-full">
                Suivre mon dossier
              </Button>
            </Link>
            <Link to="/demande-de-stage" onClick={() => setMobileOpen(false)}>
              <Button type="button" className="w-full gap-1.5">
                Déposer une demande
                <ArrowRight size={14} />
              </Button>
            </Link>
            <Link
              to="/connexion"
              onClick={() => setMobileOpen(false)}
              className="mt-1 px-3 py-2 text-center text-sm font-medium text-text-subtle hover:text-ont-blue-700"
            >
              Espace personnel
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
