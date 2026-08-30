/**
 * Région vive invisible (sr-only) annonçant l'état d'une liste qui se
 * recharge — un utilisateur de lecteur d'écran n'a autrement aucun moyen
 * de savoir qu'un changement de filtre a rafraîchi le contenu sans
 * re-parcourir la page. `role="status"` + `aria-live="polite"` : annoncé
 * dès que le texte change, sans interrompre ce qui est en cours de
 * lecture (contrairement à `assertive`).
 */
export function AnnonceChargement({ chargement, count, libelle = 'résultat(s)' }) {
  return (
    <span className="sr-only" role="status" aria-live="polite">
      {chargement ? 'Chargement…' : count != null ? `${count} ${libelle} chargé(s).` : ''}
    </span>
  );
}
