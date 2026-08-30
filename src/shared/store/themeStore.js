import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Préférence de thème choisie par l'utilisateur — clair, sombre, ou système
 * (par défaut). Persistée en localStorage (survit à la fermeture de
 * l'onglet, contrairement au jeton d'authentification en sessionStorage :
 * une préférence d'affichage n'est pas une donnée sensible). Appliquée par
 * useThemeSync, lue/modifiée par ThemeSelector — jamais manipulée en dehors
 * de ces deux points pour garder .dark sur <html> toujours cohérent avec
 * cette valeur.
 */
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ont-theme',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
