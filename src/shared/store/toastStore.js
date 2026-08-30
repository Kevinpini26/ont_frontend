import { create } from 'zustand';

let compteur = 0;

/**
 * File de notifications éphémères (voir Toast.jsx) — état global volontaire
 * (pas de persistance : un toast qui survivrait à un rechargement de page
 * n'aurait plus de sens), pour qu'un appel profondément imbriqué (gestion
 * d'erreur d'une requête, confirmation d'une action) puisse en déclencher
 * une sans avoir à faire remonter un state local jusqu'à la page.
 */
export const useToastStore = create((set, get) => ({
  toasts: [],
  push(toast) {
    const id = ++compteur;
    const duree = toast.duree ?? 4000;
    set((s) => ({ toasts: [...s.toasts, { tone: 'info', ...toast, id }] }));
    if (duree > 0) {
      setTimeout(() => get().retirer(id), duree);
    }
    return id;
  },
  retirer(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
