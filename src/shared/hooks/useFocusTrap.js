import { useEffect, useRef } from 'react';

const SELECTEUR_FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Piège le focus clavier à l'intérieur d'une modale pendant qu'elle est
 * ouverte (Tab/Shift+Tab ne s'échappent jamais vers la page derrière),
 * place le focus sur son premier élément focusable à l'ouverture, et le
 * restitue à l'élément qui avait le focus juste avant (typiquement le
 * bouton qui a ouvert la modale) à la fermeture.
 */
export function useFocusTrap(actif) {
  const conteneurRef = useRef(null);
  const elementPrecedentRef = useRef(null);

  useEffect(() => {
    if (!actif) {
      return undefined;
    }

    elementPrecedentRef.current = document.activeElement;

    function elementsFocusables() {
      const elements = conteneurRef.current?.querySelectorAll(SELECTEUR_FOCUSABLE);
      return elements ? Array.from(elements).filter((el) => el.offsetParent !== null) : [];
    }

    elementsFocusables()[0]?.focus();

    function surTab(e) {
      if (e.key !== 'Tab') {
        return;
      }

      const elements = elementsFocusables();
      if (elements.length === 0) {
        return;
      }

      const premier = elements[0];
      const dernier = elements[elements.length - 1];

      if (e.shiftKey && document.activeElement === premier) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    }

    document.addEventListener('keydown', surTab);

    return () => {
      document.removeEventListener('keydown', surTab);
      elementPrecedentRef.current?.focus?.();
    };
  }, [actif]);

  return conteneurRef;
}
