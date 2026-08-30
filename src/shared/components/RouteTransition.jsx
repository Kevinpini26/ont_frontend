import { useLocation } from 'react-router-dom';

/**
 * Légère entrée (opacité + translation, 180ms) à chaque changement de route
 * — remonter le conteneur via `key={pathname}` rejoue l'animation CSS
 * (voir .animate-entree-page dans index.css, désactivée sous
 * prefers-reduced-motion). Un changement de query string seul (filtre sur
 * une liste, par ex.) ne déclenche pas l'effet, volontairement : seul un
 * vrai changement de page doit marquer une transition.
 */
export function RouteTransition({ children }) {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="animate-entree-page">
      {children}
    </div>
  );
}
