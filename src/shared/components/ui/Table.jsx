import { useEffect, useRef, useState } from 'react';

/**
 * Sur mobile/tablette, un tableau plus large que l'écran défile
 * horizontalement (overflow-x-auto) mais rien ne l'indique visuellement une
 * fois la barre de défilement masquée par le système — l'utilisateur peut
 * ne jamais découvrir les colonnes coupées. Ces liserés dégradés
 * apparaissent uniquement quand il reste du contenu à faire défiler de ce
 * côté, et disparaissent une fois qu'on y est arrivé.
 */
export function TableWrap({ children }) {
  const scrollRef = useRef(null);
  const [peutDefilerGauche, setPeutDefilerGauche] = useState(false);
  const [peutDefilerDroite, setPeutDefilerDroite] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    function mettreAJour() {
      setPeutDefilerGauche(element.scrollLeft > 1);
      setPeutDefilerDroite(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
    }

    mettreAJour();
    element.addEventListener('scroll', mettreAJour);
    const observateur = new ResizeObserver(mettreAJour);
    observateur.observe(element);

    return () => {
      element.removeEventListener('scroll', mettreAJour);
      observateur.disconnect();
    };
  }, [children]);

  return (
    <div className="relative">
      {/* tabIndex + role/aria-label : sans ça, un tableau plus large que
          l'écran n'est défilable qu'à la souris/au doigt — un clavier seul
          ne donne accès à rien au-delà du bord visible. */}
      <div ref={scrollRef} tabIndex={0} role="region" aria-label="Tableau, défilement horizontal" className="overflow-x-auto">
        {children}
      </div>
      {peutDefilerGauche && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent dark:from-slate-900" />
      )}
      {peutDefilerDroite && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent dark:from-slate-900" />
      )}
    </div>
  );
}

export const tableClass = 'w-full min-w-full text-left text-sm';
export const theadClass = 'border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400';
export const thClass = 'px-4 py-2.5 font-semibold whitespace-nowrap';
export const tbodyClass = 'divide-y divide-slate-100 dark:divide-slate-800';
export const tdClass = 'px-4 py-3 align-middle text-slate-700 dark:text-slate-300';
export const trHoverClass = 'hover:bg-slate-50 dark:hover:bg-slate-800/50';
