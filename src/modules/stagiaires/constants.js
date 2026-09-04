export const STATUTS = [
  'dossier_recu',
  'en_attente_affectation',
  'affecte',
  'stage_en_cours',
  'evaluation_en_cours',
  'cloture',
];

export const STATUT_LABELS = {
  dossier_recu: 'Dossier reçu',
  en_attente_affectation: "En attente d'affectation",
  affecte: 'Affecté',
  stage_en_cours: 'Stage en cours',
  evaluation_en_cours: 'Évaluation en cours',
  cloture: 'Clôturé',
};

export const DOCUMENT_TYPE_LABELS = {
  lettre_stage_universite: "Lettre de stage de l'université",
  piece_identite: "Pièce d'identité",
  attestation_inscription: "Attestation d'inscription",
  attestation_stage: 'Attestation de stage',
  cv: 'CV du candidat',
  diplome_etat: "Diplôme d'État",
  dernier_diplome: 'Dernier diplôme obtenu',
  lettre_demande_stage: 'Lettre de demande de stage',
};

export const TYPE_STAGE_LABELS = {
  academique: 'Stage académique',
  professionnel: 'Stage professionnel',
};

/** Lot 4 — tableau de répartition. */
export const TABLEAU_REPARTITION_STATUT_LABELS = {
  brouillon: 'Brouillon',
  chez_reception: 'Chez la Réception',
  en_attente_avis_dg: "En attente d'avis DG",
  approuve: 'Approuvé',
};
