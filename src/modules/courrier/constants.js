// "en_circuit_hierarchique" n'est plus une étape du circuit standard (la
// DGA n'intervient plus que via l'intérim, voir DgDisponibilite côté
// backend) — retiré du pipeline actif, mais son libellé reste ci-dessous
// pour l'affichage défensif d'un historique déjà existant.
//
// "en_attente_tri" (tri par degré d'urgence, Secrétariat 01) s'intercale
// entre "recu" et "en_attente_avis_dg" depuis la correction du circuit
// (bouclage) — voir config('courrier.circuit_transitions') côté backend.
// "retour_reception" (un avis DG "réservé" renvoie le dossier boucler vers
// la Réception) et "en_attente_classeur" (un degré normal reste tenu par le
// Secrétariat 01, qui le transmet lui-même quand il le juge bon) n'apparaissent
// volontairement PAS dans cette liste linéaire : une frise à sens unique ne
// peut pas bien représenter un cycle ou un détour qui reconverge — voir
// StatutTimeline.jsx, qui les affiche comme un retour/détour temporaire vers
// "en_attente_avis_dg" plutôt que de casser l'index de progression.
//
// "projet_reponse_en_cours"/"en_relecture" renommés en "projet_a_rediger"/
// "projet_a_valider" (lot assistants) : la rédaction du projet de réponse
// revient aux quatre postes assistants, le Secrétariat 01 gardant le tri —
// voir docs/questions-ont.md côté backend.
export const STATUTS = [
  'recu',
  'en_attente_tri',
  'en_attente_avis_dg',
  'projet_a_rediger',
  'projet_a_valider',
  'signe',
  'enregistre',
];

/**
 * Circuit court (direction vers direction, necessite_avis_dg = false) :
 * enregistrement direct depuis "recu", sans passer par les étapes
 * intermédiaires du circuit complet.
 */
export const STATUTS_CIRCUIT_COURT = ['recu', 'enregistre'];

/**
 * Circuit "courrier initié par la DG" (initie_par_dg = true) : ni
 * Protocole ni avis DG (il part déjà de la DG), mais relecture et
 * signature restent obligatoires — deux variantes selon que le rédacteur a
 * coché "Nécessite la validation de la DG avant envoi" ou non (voir
 * CircuitQueuePage.jsx).
 */
export const STATUTS_INITIE_PAR_DG_AVEC_VALIDATION = ['en_attente_validation_dg', 'en_relecture', 'signe', 'enregistre'];
export const STATUTS_INITIE_PAR_DG_SANS_VALIDATION = ['en_relecture', 'signe', 'enregistre'];

export const STATUT_LABELS = {
  recu: 'Reçu',
  brouillon_direction: 'Brouillon produit par une direction',
  au_protocole: 'Au protocole (historique)',
  en_circuit_hierarchique: 'En circuit hiérarchique',
  en_attente_tri: 'En attente de tri',
  en_attente_classeur: "Au classeur d'attente",
  retour_reception: 'Retour à la Réception',
  en_attente_avis_dg: "En attente d'avis DG",
  projet_a_rediger: 'Projet de réponse à rédiger',
  projet_a_valider: 'Projet en attente de validation',
  en_dispatch: 'En dispatch vers la direction',
  dispatch_execute: 'Dispatch exécuté',
  chez_direction: 'Chez le secrétariat de la direction',
  en_attente_validation_dg: 'En attente de validation DG',
  en_relecture: 'En relecture',
  signe: 'Signé',
  enregistre: 'Enregistré',
};

/**
 * Les quatre postes habilités à rédiger le projet de réponse (lot
 * assistants) — voir config('courrier.circuit_transitions.complet.projet_a_rediger')
 * côté backend. Indifféremment les uns des autres, aucune répartition par
 * type de dossier (voir docs/questions-ont.md).
 */
export const POSTES_ASSISTANTS = ['assistant_1', 'assistant_2', 'assistant_dga'];

export const TYPE_LABELS = {
  demande_stage: 'Demande de stage',
  correspondance_generale: 'Correspondance générale',
};

export const CLASSIFICATION_LABELS = {
  interne: 'Interne',
  externe: 'Externe',
};

/** Mentions d'imputation normalisées (Lot 3) — voir MentionImputation côté backend. */
export const MENTION_IMPUTATION_LABELS = {
  pour_attribution: 'Pour attribution',
  pour_avis: 'Pour avis',
  pour_suite_utile: 'Pour suite utile',
  pour_information: 'Pour information',
  pour_classement: 'Pour classement',
};

/**
 * Degré d'urgence (tri du Secrétariat 01) — `null` (pas encore trié) volontairement
 * absent de cette table : jamais affiché avec un libellé/couleur de "normal"
 * par erreur, toujours distingué explicitement (voir BadgeUrgence).
 */
export const DEGRE_URGENCE_LABELS = {
  normal: 'Normal',
  urgent: 'Urgent',
  tres_urgent: 'Très urgent',
};

/** Teinte du Badge (voir shared/components/ui/Badge) associée à chaque degré. */
export const TONE_URGENCE = { normal: 'neutral', urgent: 'warning', tres_urgent: 'danger' };

/** Ordre de priorité d'affichage — non trié (pas encore trié) toujours en dernier. */
export const ORDRE_URGENCE = { tres_urgent: 0, urgent: 1, normal: 2 };

/**
 * Poste du circuit central habilité à faire avancer un courrier depuis
 * chaque statut, et action correspondante — miroir de
 * config('courrier.circuit_transitions') côté backend, pour piloter
 * l'affichage des files d'attente et actions autorisées par poste.
 *
 * `necessiteAvisDg` distingue les deux circuits quand un même statut
 * ("recu") existe dans les deux : omis quand l'entrée s'applique aux deux
 * circuits indifféremment.
 */
export const ACTION_PAR_POSTE = {
  // Un retour réservé repart obligatoirement vers SEC1, jamais directement
  // vers la DG.
  reception: [
    { statutDepart: 'recu', modeReception: 'depot_en_ligne', endpoint: 'enregistrer', libelle: 'Enregistrer le dépôt' },
    { statutDepart: 'retour_reception', endpoint: 'transmettre-sec1', libelle: 'Transmettre à SEC1' },
  ],
  // La DGA n'agit réellement que lorsque la DG est marquée indisponible
  // (intérim) — garde dynamique appliquée côté backend
  // (CourrierCircuitService::rendreAvisDg()), pas ici.
  dga: [
    { statutDepart: 'en_attente_avis_dg', endpoint: 'rendre-avis', libelle: "Rendre un avis (intérim de la DG)" },
  ],
  dg: [
    { statutDepart: 'en_attente_avis_dg', endpoint: 'rendre-avis', libelle: 'Rendre un avis' },
    { statutDepart: 'en_attente_validation_dg', endpoint: 'valider-avant-diffusion', libelle: 'Valider avant diffusion' },
    { statutDepart: 'en_relecture', endpoint: 'signer', libelle: 'Signer' },
    // Même signature, statut propre au circuit complet (lot assistants) —
    // voir CourrierStatut::PROJET_A_VALIDER côté backend.
    { statutDepart: 'projet_a_valider', endpoint: 'signer', libelle: 'Signer' },
  ],
  secretariat_1: [
    // La Réception remet le bordereau au Secrétariat 01. Après décharge,
    // celui-ci place le dossier dans sa file de tri.
    { statutDepart: 'recu', necessiteAvisDg: true, endpoint: 'transmettre-tri', libelle: 'Transmettre au tri' },
    // C'est ici, et seulement ici, que le degré d'urgence est réellement
    // choisi (voir CourrierDetailPage.jsx) — jamais une simple transition
    // en un clic comme les autres. Un degré normal part au classeur
    // d'attente (voir l'entrée suivante), pas directement à la DG.
    { statutDepart: 'en_attente_tri', endpoint: 'transmettre-avis-dg', libelle: 'Transmettre à la DG pour avis' },
    // Lot assistants : le Secrétariat 01 ne rédige plus le projet de
    // réponse (voir Poste::ASSISTANT_* côté backend) — il garde le tri et
    // décide seul quand transmettre un dossier tenu au classeur.
    { statutDepart: 'en_attente_classeur', endpoint: 'transmettre-depuis-classeur', libelle: 'Transmettre à la DG depuis le classeur' },
  ],
  secretariat_2: [
    { statutDepart: 'signe', endpoint: 'enregistrer', libelle: 'Enregistrer' },
    // Lot 3 : un avis DG favorable sur un courrier déjà imputé arrive ici
    // plutôt qu'en projet_a_rediger (voir "dg" ci-dessus).
    { statutDepart: 'en_dispatch', endpoint: 'dispatcher-direction', libelle: 'Transmettre au secrétariat de la direction' },
  ],
};
