import { useAuthStore } from '../../modules/kernel/store/authStore';

/**
 * Construit un envoi de secours pour une action encore en attente au moment
 * où l'onglet se ferme (voir toastStore.pousserDiffere/viderActionsDifferees)
 * — `fetch(..., { keepalive: true })`, pas `navigator.sendBeacon` : sendBeacon
 * ne transporte aucun en-tête personnalisé, donc jamais notre jeton Bearer
 * (voir shared/api/client.js), alors que `keepalive` obtient la même
 * garantie de survie à la fermeture de page tout en gardant nos en-têtes.
 * Best-effort volontaire : la réponse n'est jamais lue (la page est en train
 * de disparaître), les erreurs réseau sont avalées.
 */
export function creerEnvoiDeSecours(chemin, corps = {}) {
  return function envoyer() {
    const token = useAuthStore.getState().token;
    const base = import.meta.env.VITE_API_BASE_URL ?? '';
    fetch(`${base}${chemin}`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(corps),
    }).catch(() => {});
  };
}
