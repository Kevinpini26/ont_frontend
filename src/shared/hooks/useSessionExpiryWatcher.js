import { useEffect, useState } from 'react';
import { useAuthStore } from '../../modules/kernel/store/authStore';

const AVERTISSEMENT_MS = 2 * 60 * 1000;

/**
 * Programme un avertissement deux minutes avant l'expiration du jeton puis
 * la déconnexion automatique à l'échéance — plutôt qu'un 401 brutal reçu
 * en pleine saisie sur la prochaine requête API. Sanctum ne fournissant
 * aucun mécanisme de rafraîchissement de jeton, la seule action possible à
 * l'expiration est de renvoyer l'utilisateur se reconnecter.
 */
export function useSessionExpiryWatcher() {
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const logout = useAuthStore((s) => s.logout);
  const [avertissementActif, setAvertissementActif] = useState(false);

  useEffect(() => {
    setAvertissementActif(false);

    if (!expiresAt) {
      return undefined;
    }

    const echeanceMs = new Date(expiresAt).getTime();
    const delaiExpiration = echeanceMs - Date.now();

    if (delaiExpiration <= 0) {
      logout();
      return undefined;
    }

    const minuteurs = [setTimeout(() => logout(), delaiExpiration)];
    const delaiAvertissement = delaiExpiration - AVERTISSEMENT_MS;

    if (delaiAvertissement <= 0) {
      setAvertissementActif(true);
    } else {
      minuteurs.push(setTimeout(() => setAvertissementActif(true), delaiAvertissement));
    }

    return () => minuteurs.forEach(clearTimeout);
  }, [expiresAt, logout]);

  return avertissementActif;
}
