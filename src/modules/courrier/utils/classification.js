/**
 * Reflet exact de `Courrier::classificationAttendue()` côté backend — le
 * classement interne/externe n'est jamais un choix libre de l'agent, il est
 * recalculé et rejeté côté serveur si l'agent envoie autre chose. Calculé
 * ici uniquement pour l'affichage et pour l'envoyer déjà correct : un
 * dépôt de la Réception sans direction d'origine (aucun expéditeur externe
 * nommé, cas le plus courant du formulaire rapide de la Réception) est
 * externe par défaut, tout comme un candidat ou un expéditeur externe nommés
 * — seul un courrier initié par une direction, ou par la DG, est interne.
 *
 * @param {{ expediteur_externe_nom?: string|null, candidat?: { nom?: string }|null, direction_origine?: object|null, initie_par_dg?: boolean }} courrier
 * @returns {'interne'|'externe'}
 */
export function classificationAttendue(courrier) {
  const estExterne =
    Boolean(courrier.expediteur_externe_nom) ||
    Boolean(courrier.candidat?.nom) ||
    (!courrier.direction_origine && !courrier.initie_par_dg);

  return estExterne ? 'externe' : 'interne';
}
