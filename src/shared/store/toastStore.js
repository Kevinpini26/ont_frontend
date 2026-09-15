import { create } from 'zustand';

let compteur = 0;

/**
 * Actions différées en attente d'expiration (voir pousserDiffere ci-dessous)
 * — hors de l'état Zustand volontairement : un timeoutId et une fonction
 * `executer` ne sont pas des données sérialisables/comparables, et n'ont
 * aucune raison de déclencher un re-rendu par eux-mêmes (seul le tableau
 * `toasts` doit le faire).
 */
const enAttente = new Map();

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
  /**
   * Ferme un toast — jamais l'action différée qu'il annonce éventuellement
   * (voir pousserDiffere) : fermer la notification (le X) n'est pas
   * "Annuler", qui seul empêche réellement le départ (annulerDiffere
   * ci-dessous). Un toast annulable fermé par le X continue son compte à
   * rebours en silence, exactement comme s'il était resté affiché.
   */
  retirer(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  /**
   * Toast avec Annuler réel (voir docs/questions-ont.md, corrections
   * PosteDeTravail) : `executer` ne part JAMAIS avant l'expiration du délai
   * — un toast qui masquerait une action déjà envoyée au serveur serait un
   * mensonge. `annulerDiffere` la supprime avant départ. `beacon` (optionnel)
   * décrit la même action sous la forme {url, method, body} pour le vidage
   * forcé sur fermeture d'onglet (voir viderActionsDifferees) : à ce moment
   * précis, aucun client HTTP normal (axios) n'a la garantie de terminer sa
   * requête avant que la page ne disparaisse.
   */
  pousserDiffere({ message, executer, beacon, onAnnuler, duree = 8000, tone = 'info' }) {
    const id = ++compteur;
    const expireA = Date.now() + duree;
    const timeoutId = setTimeout(() => {
      enAttente.delete(id);
      executer();
      get().retirer(id);
    }, duree);
    enAttente.set(id, { timeoutId, executer, beacon, onAnnuler });
    set((s) => ({ toasts: [...s.toasts, { id, tone, message, expireA, annulable: true }] }));
    return id;
  },

  /**
   * Annule une action différée avant son départ — jamais après (voir
   * pousserDiffere). `onAnnuler`, s'il a été fourni, redonne la main à
   * l'appelant (ex. réafficher le dossier retiré de façon optimiste de sa
   * bannette — voir PosteDeTravailTriPage) : sans lui, un agent qui annule
   * verrait son dossier rester invisible alors que rien n'a été envoyé.
   */
  annulerDiffere(id) {
    const entree = enAttente.get(id);
    if (entree) {
      clearTimeout(entree.timeoutId);
      enAttente.delete(id);
      entree.onAnnuler?.();
    }
    get().retirer(id);
  },

  /**
   * Fait partir immédiatement toute action encore en attente, plutôt que
   * de la perdre — appelé à la navigation (voir ToastContainer) et sur
   * beforeunload (fermeture/rechargement d'onglet). `beacon`, quand fourni,
   * part via fetch keepalive (voir httpBeacon.js) : sendBeacon natif ne
   * transporte aucun en-tête personnalisé, incompatible avec notre jeton
   * Bearer (voir shared/api/client.js) — keepalive est l'équivalent
   * fonctionnel qui survit, lui aussi, à la fermeture de la page.
   */
  viderActionsDifferees() {
    for (const [id, entree] of enAttente) {
      clearTimeout(entree.timeoutId);
      if (entree.beacon) {
        entree.beacon();
      } else {
        entree.executer();
      }
    }
    enAttente.clear();
    set((s) => ({ toasts: s.toasts.filter((t) => !t.annulable) }));
  },
}));
