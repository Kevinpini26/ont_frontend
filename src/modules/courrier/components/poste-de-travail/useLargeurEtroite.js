import { useEffect, useState } from 'react';

/**
 * Règle de largeur tranchée pour PosteDeTravail (voir docs/questions-ont.md) :
 * les portables de l'ONT tournent à 1366px, où 260px (rail) + 420px (file) +
 * un panneau latéral ne laissent plus rien au document. En dessous de ce
 * seuil, RailBannettes se replie en icônes et SlidePanel se superpose au
 * document avec un voile au lieu de le comprimer — voir ces deux composants.
 */
const SEUIL_PX = 1280;

export function useLargeurEtroite() {
  const [etroit, setEtroit] = useState(() => window.innerWidth < SEUIL_PX);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${SEUIL_PX - 1}px)`);
    function surChangement(e) {
      setEtroit(e.matches);
    }
    mq.addEventListener('change', surChangement);
    setEtroit(mq.matches);
    return () => mq.removeEventListener('change', surChangement);
  }, []);

  return etroit;
}
