import { useEffect, useRef, useState } from 'react';

/**
 * Fondu + légère translation verticale (8px) à l'entrée d'une section dans
 * le viewport, sur 300ms — une fois déclenché, jamais rejoué (observer
 * déconnecté après la première apparition). Réservé aux pages publiques :
 * discret et non répétitif, jamais utilisé dans l'espace applicatif
 * interne.
 *
 * `index` décale l'apparition de 60ms par cran (voir SERVICES.map/
 * DIRECTIONS.map) : un style inline plutôt qu'une classe Tailwind, le
 * délai étant une valeur calculée, pas un palier fixe de l'échelle.
 */
export function useRevealOnScroll(index = 0) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    className: `transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`,
    style: { transitionDelay: `${index * 60}ms` },
  };
}
