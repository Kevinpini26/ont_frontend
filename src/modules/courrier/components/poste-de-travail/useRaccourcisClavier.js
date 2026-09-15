import { useEffect } from 'react';

/**
 * Correction #2 (voir docs/questions-ont.md) : sans cette garde, un agent
 * qui tape le mot "urgent" dans une annotation marque son dossier urgent à
 * la lettre "u". Couvre input/textarea/select classiques ET le
 * contenteditable de TipTap (voir TipTapEditor.jsx), qui n'est ni l'un ni
 * l'autre du point de vue du DOM.
 */
function focusDansUnChamp() {
  const actif = document.activeElement;
  if (!actif) return false;
  const tag = actif.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || actif.isContentEditable;
}

/**
 * Raccourcis clavier globaux d'un poste de travail (voir PosteDeTravail.jsx)
 * — `carte` associe une touche (`e.key`, en minuscule pour les lettres) à un
 * gestionnaire ; `actif` (défaut true) permet de désactiver l'ensemble sans
 * démonter le hook (ex. pendant qu'un panneau latéral bloquant est ouvert et
 * gère lui-même Échap).
 */
export function useRaccourcisClavier(carte, actif = true) {
  useEffect(() => {
    if (!actif) return undefined;

    function surTouche(e) {
      if (focusDansUnChamp()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const gestionnaire = carte[e.key.toLowerCase()];
      if (!gestionnaire) return;

      e.preventDefault();
      gestionnaire(e);
    }

    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carte, actif]);
}
