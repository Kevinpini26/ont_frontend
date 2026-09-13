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
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-surface to-transparent" />
      )}
      {peutDefilerDroite && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface to-transparent" />
      )}
    </div>
  );
}

export const tableClass = 'w-full min-w-full text-left text-sm';
// Jamais sticky : TableWrap ci-dessus pose overflow-x-auto sur son wrapper
// pour le défilement horizontal, ce qui — par la règle CSS qui force
// overflow-y à "auto" dès que overflow-x n'est pas "visible" — fait de ce
// wrapper malgré lui le conteneur de référence de tout position: sticky
// descendant, plutôt que la fenêtre. Un en-tête sticky s'y fige alors en
// permanence 56px sous le haut du wrapper (confirmé via
// getBoundingClientRect(), y compris avec le sticky posé sur chaque <th>
// plutôt que sur le <thead>), recouvrant la ou les premières lignes dès
// qu'un tableau est court — pas un cas limite, un défaut structurel de
// TableWrap qu'aucune combinaison overflow-y (auto/hidden/clip) ne corrige.
export const theadClass = 'border-b border-border bg-surface text-label font-semibold uppercase tracking-wide text-text-subtle';
export const thClass = 'px-4 py-3 font-semibold whitespace-nowrap';
// Colonnes de nombres/dates : alignées à droite, chiffres à chasse fixe
// pour que les lignes successives restent verticalement comparables.
export const thClassChiffre = `${thClass} text-right`;
export const tbodyClass = 'divide-y divide-border';
// 44 px de hauteur de ligne (py-3 = 12 px + ~20 px de line-height du texte
// sm) : assez d'air pour rester lisible sans allonger inutilement les
// listes denses (utilisateurs, courriers…).
export const tdClass = 'px-4 py-3 align-middle text-text-muted';
export const tdClassChiffre = `${tdClass} text-right tabular-nums`;
// Première colonne : en gras et dans la couleur de texte principale
// (`text-text`, pas `text-muted`) — sert d'ancre visuelle à la ligne.
export const tdClassPremiere = `${tdClass} font-semibold text-text`;
export const trHoverClass = 'hover:bg-surface-sunken';

/**
 * En-tête de colonne cliquable avec indicateur de tri visuel — ↑/↓ pour la
 * colonne active, un chevron neutre discret pour les autres (découvrable au
 * survol/focus plutôt qu'invisible tant qu'on ne trie pas encore dessus).
 * Le tri lui-même (comparateur, état asc/desc) reste porté par la page
 * appelante : chaque liste a ses propres colonnes/types de valeurs, un
 * mécanisme générique ici ferait plus d'abstraction que de code économisé.
 */
export function ThSortable({ label, sortKey, tri, onTri, className = '' }) {
  const actif = tri?.colonne === sortKey;
  const sens = actif ? tri.sens : null;
  return (
    <th className={`${thClass} ${className}`}>
      <button
        type="button"
        onClick={() => onTri(sortKey)}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ont-blue-500"
      >
        {label}
        <span className={`text-[0.6rem] leading-none ${actif ? 'text-ont-blue-500' : 'text-text-subtle/60'}`} aria-hidden="true">
          {sens === 'desc' ? '▼' : sens === 'asc' ? '▲' : '▲▼'}
        </span>
      </button>
    </th>
  );
}

/**
 * Petit utilitaire de tri client (données déjà chargées en mémoire) partagé
 * par les pages qui utilisent ThSortable : bascule asc → desc → aucun tri
 * sur re-clic de la même colonne, part en asc sur une nouvelle colonne.
 */
export function basculerTri(triActuel, colonne) {
  if (triActuel?.colonne !== colonne) return { colonne, sens: 'asc' };
  if (triActuel.sens === 'asc') return { colonne, sens: 'desc' };
  return null;
}

/**
 * Lignes de squelette à insérer dans un <tbody> existant pendant le
 * chargement, en gardant l'en-tête (et donc les intitulés de colonnes)
 * visible — remplacer tout le tableau par un bloc centré fait perdre ce
 * repère à chaque rafraîchissement de filtre.
 */
export function SkeletonRows({ colonnes, lignes = 5 }) {
  return (
    <>
      {Array.from({ length: lignes }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: colonnes }).map((_, j) => (
            <td key={j} className={tdClass}>
              <div className="h-3.5 w-full max-w-32 animate-pulse rounded bg-border-strong" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
