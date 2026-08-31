import { useEffect, useRef, useState } from 'react';

/**
 * Anime un entier de 0 à `cible` une seule fois, au moment où l'élément
 * entre dans le viewport (voir la bande de chiffres de HomePage.jsx) —
 * jamais rejoué ensuite. `null`/non-numérique reste affiché tel quel, sans
 * animation (ex: le délai moyen, qui peut être absent).
 */
export function useCompteur(cible) {
  const ref = useRef(null);
  const [valeur, setValeur] = useState(0);
  const anime = typeof cible === 'number' && Number.isFinite(cible);

  useEffect(() => {
    const node = ref.current;
    if (!node || !anime) return undefined;

    const reduitLeMouvement = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        if (reduitLeMouvement) {
          setValeur(cible);
          return;
        }

        const duree = 900;
        const debut = performance.now();

        function etape(maintenant) {
          const progression = Math.min(1, (maintenant - debut) / duree);
          setValeur(Math.round(cible * progression));
          if (progression < 1) requestAnimationFrame(etape);
        }
        requestAnimationFrame(etape);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `cible` volontairement figé à la première apparition
  }, [anime]);

  return { ref, valeur: anime ? valeur : cible };
}
