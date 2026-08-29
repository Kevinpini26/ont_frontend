import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Récupération de données partagée : chargement/erreur/vide gérés une
 * seule fois, et surtout annulation de la requête en cours au démontage
 * ou avant qu'une nouvelle ne parte (changement de dépendances, ou rappel
 * manuel de `recharger`) — sans ça, une réponse lente déclenchée par un
 * ancien jeu de filtres peut arriver après une réponse plus récente et
 * écraser l'affichage avec des résultats obsolètes.
 *
 * `fetcher` reçoit un AbortSignal à transmettre à l'appel API sous-jacent
 * (voir les fonctions de l'API qui acceptent déjà `signal`). `deps`
 * détermine quand relancer automatiquement, exactement comme un
 * useEffect. `recharger` renvoie la promesse de la requête, pour les
 * appelants qui doivent attendre la fin du rechargement (ex. avant de
 * réactiver un bouton).
 */
export function useRequete(fetcher, deps) {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const controleurRef = useRef(null);

  const recharger = useCallback(() => {
    controleurRef.current?.abort();
    const controleur = new AbortController();
    controleurRef.current = controleur;

    setChargement(true);
    setErreur(null);

    return fetcherRef
      .current(controleur.signal)
      .then((resultat) => {
        if (!controleur.signal.aborted) {
          setDonnees(resultat);
        }
        return resultat;
      })
      .catch((err) => {
        if (!controleur.signal.aborted && err.code !== 'ERR_CANCELED') {
          setErreur(err);
        }
      })
      .finally(() => {
        if (!controleur.signal.aborted) {
          setChargement(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    recharger();
    return () => controleurRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recharger]);

  return { donnees, setDonnees, erreur, chargement, recharger };
}
