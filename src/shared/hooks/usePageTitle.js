import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { pageCourante } from '../navigation';

/**
 * Fiches de détail : jamais dans navigationForUser (on n'y arrive pas par
 * la sidebar mais depuis une liste), donc jamais résolues par pageCourante.
 * Motif testé dans l'ordre — le premier qui correspond gagne.
 */
const PAGES_DYNAMIQUES = [
  { motif: /^\/courriers\/[^/]+$/, section: 'Courrier', label: 'Détail du dossier' },
  { motif: /^\/stagiaires\/[^/]+$/, section: 'Stagiaires', label: 'Fiche stagiaire' },
];

/**
 * Section + libellé de la page courante, pour le fil d'Ariane de l'en-tête
 * (voir AppLayout) — dérivé de la même source que la sidebar (navigation.js)
 * pour ne jamais désynchroniser les deux.
 */
export function usePageTitle(user) {
  const { pathname } = useLocation();

  return useMemo(() => {
    const page = pageCourante(pathname, user);
    if (page) return { section: page.section, label: page.label };

    const dynamique = PAGES_DYNAMIQUES.find((p) => p.motif.test(pathname));
    if (dynamique) return { section: dynamique.section, label: dynamique.label };

    return { section: null, label: null };
  }, [pathname, user]);
}
