export const ROLES = {
  ADMINISTRATEUR: 'administrateur',
  AGENT_DFP: 'agent_dfp',
  DIRECTEUR_DIRECTION: 'directeur_direction',
  RESPONSABLE_DIRECTION: 'responsable_direction', // historique
  SECRETARIAT_DIRECTION: 'secretariat_direction',
  AGENT_CIRCUIT_COURRIER: 'agent_circuit_courrier',
};

export const ROLE_LABELS = {
  [ROLES.ADMINISTRATEUR]: 'Administrateur',
  [ROLES.AGENT_DFP]: 'Agent DFP',
  [ROLES.DIRECTEUR_DIRECTION]: 'Directeur de direction',
  [ROLES.RESPONSABLE_DIRECTION]: 'Directeur de direction (rôle historique)',
  [ROLES.SECRETARIAT_DIRECTION]: 'Secrétariat de direction',
  [ROLES.AGENT_CIRCUIT_COURRIER]: 'Agent de circuit courrier',
};

export const ROLES_DIRECTEUR_DIRECTION = [ROLES.DIRECTEUR_DIRECTION, ROLES.RESPONSABLE_DIRECTION];
export const ROLES_ATTRIBUABLES = Object.values(ROLES).filter((role) => role !== ROLES.RESPONSABLE_DIRECTION);

export function estDirecteurDirection(user) {
  return ROLES_DIRECTEUR_DIRECTION.includes(user?.role);
}

export const POSTES = {
  RECEPTION: 'reception',
  DGA: 'dga',
  ASSISTANT_1: 'assistant_1',
  ASSISTANT_2: 'assistant_2',
  ASSISTANT_DGA: 'assistant_dga',
  DG: 'dg',
  SECRETARIAT_1: 'secretariat_1',
  SECRETARIAT_2: 'secretariat_2',
};

export const POSTE_LABELS = {
  [POSTES.RECEPTION]: 'Réception',
  protocole: 'Protocole (historique)',
  [POSTES.DGA]: 'Directeur Général Adjoint',
  assistant_protocole: 'Assistant du Protocole (historique)',
  [POSTES.ASSISTANT_1]: 'Assistant 1 (Ass1)',
  [POSTES.ASSISTANT_2]: 'Assistant 2 (Ass2)',
  [POSTES.ASSISTANT_DGA]: 'Assistant du DGA (Ass.Dga)',
  [POSTES.DG]: 'Directeur Général',
  [POSTES.SECRETARIAT_1]: 'Secrétariat 01',
  [POSTES.SECRETARIAT_2]: 'Secrétariat 02',
};
