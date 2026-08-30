/**
 * Recharts dessine du SVG et ne peut pas consommer directement les classes
 * Tailwind : ces hex sont la copie fidèle des tokens `ont-*` définis dans
 * `src/index.css` (@theme). Toute nouvelle teinte de graphique doit passer
 * par ce fichier plutôt que par un hex isolé dans une page, pour rester
 * alignée avec la charte graphique ONT en un seul endroit.
 */
export const CHART_COLORS = {
  ontBlue600: '#0e6cd5',
  ontGold500: '#fec012',
  ontGreen500: '#96c024',
  ontViolet500: '#a254cd',
  ontRed500: '#e11821',
  axisTick: '#64748b',
  grid: '#e2e8f0',
};
