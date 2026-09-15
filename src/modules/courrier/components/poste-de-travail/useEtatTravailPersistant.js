import { useEffect, useState } from 'react';

/**
 * Correction #4 (voir docs/questions-ont.md) : la bannette choisie, la
 * position dans la file et le dossier sélectionné se retrouvent au retour
 * d'une vue pleine page (ouvrir un document puis revenir ne doit pas
 * recommencer la descente de file) — sessionStorage, pas localStorage : cet
 * état de travail n'a de sens que pour l'onglet en cours, jamais à retrouver
 * le lendemain sur un autre poste.
 */
export function useEtatTravailPersistant(cle, etatInitial) {
  const [etat, setEtat] = useState(() => {
    try {
      const brut = sessionStorage.getItem(cle);
      return brut ? { ...etatInitial, ...JSON.parse(brut) } : etatInitial;
    } catch {
      return etatInitial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(cle, JSON.stringify(etat));
    } catch {
      // Stockage indisponible (navigation privée, quota) : dégrade en
      // silence vers un état non persistant plutôt que de bloquer l'écran.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle, etat]);

  return [etat, setEtat];
}
