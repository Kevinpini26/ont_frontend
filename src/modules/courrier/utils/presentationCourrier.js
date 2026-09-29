import { STATUT_LABELS } from '../constants';

export function libelleStatutCourrier(courrier) {
  if (courrier?.statut === 'projet_a_valider' && courrier.relecture_validee_at) {
    return 'Projet prêt à signer';
  }

  return STATUT_LABELS[courrier?.statut] ?? courrier?.statut_label ?? courrier?.statut ?? '';
}