// "en_circuit_hierarchique" n'est plus une étape du circuit standard (la
// DGA n'intervient plus que via l'intérim, voir DgDisponibilite côté
// backend) — retiré du pipeline actif, mais son libellé reste ci-dessous
// pour l'affichage défensif d'un historique déjà existant.
//
// "en_attente_tri" (tri par degré d'urgence, Secrétariat 01) s'intercale
// entre "recu" et "en_attente_avis_dg" depuis la correction du circuit
// (bouclage) — voir config('courrier.circuit_transitions') côté backend.
// "retour_reception" (un avis DG "réservé" renvoie le dossier boucler vers
// la Réception) n'apparaît volontairement PAS dans cette liste linéaire :
// une frise à sens unique ne peut pas bien représenter un cycle — voir
// StatutTimeline.jsx, qui l'affiche comme un retour temporaire vers
// "en_attente_avis_dg" plutôt que de casser l'index de progression.
export const STATUTS = [
  'recu',
  'en_attente_tri',
  'au_protocole',
  'en_attente_avis_dg',
  'projet_reponse_en_cours',
  'en_relecture',
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
  au_protocole: 'Au protocole',
  en_circuit_hierarchique: 'En circuit hiérarchique',
  en_attente_tri: 'En attente de tri',
  retour_reception: 'Retour à la Réception',
  en_attente_avis_dg: "En attente d'avis DG",
  projet_reponse_en_cours: 'Projet de réponse en cours',
  en_attente_validation_dg: 'En attente de validation DG',
  en_relecture: 'En relecture',
  signe: 'Signé',
  enregistre: 'Enregistré',
};

export const TYPE_LABELS = {
  demande_stage: 'Demande de stage',
  correspondance_generale: 'Correspondance générale',
};

export const CLASSIFICATION_LABELS = {
  interne: 'Interne',
  externe: 'Externe',
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
  // La Réception crée le courrier (statut initial "recu") ET représente à
  // la DG un dossier revenu "réservé" (voir representer-dg) — ce dernier
  // est bien une vraie entrée de file, contrairement à la création qui
  // reste un formulaire à part dans CircuitQueuePage.jsx.
  reception: [
    { statutDepart: 'retour_reception', endpoint: 'representer-dg', libelle: 'Représenter à la DG' },
  ],
  protocole: [
    // Inatteignable en pratique tant que config('courrier.categories_protocole')
    // reste vide côté backend (aucune catégorie ne l'exige) — conservé pour
    // le jour où l'ONT confirme une catégorie concernée.
    { statutDepart: 'recu', necessiteAvisDg: true, endpoint: 'transmettre-protocole', libelle: 'Transmettre au protocole' },
    { statutDepart: 'au_protocole', endpoint: 'transmettre-au-tri-depuis-protocole', libelle: 'Transmettre au tri' },
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
  ],
  secretariat_1: [
    // Chemin par défaut depuis "recu" (voir "protocole" ci-dessus) : la
    // Réception transmet directement au tri du Secrétariat 01, sans
    // Protocole — le tri précède toujours la DG.
    { statutDepart: 'recu', necessiteAvisDg: true, endpoint: 'transmettre-tri', libelle: 'Transmettre au tri' },
    // C'est ici, et seulement ici, que le degré d'urgence est réellement
    // choisi (voir CourrierDetailPage.jsx) — jamais une simple transition
    // en un clic comme les autres.
    { statutDepart: 'en_attente_tri', endpoint: 'transmettre-avis-dg', libelle: 'Transmettre à la DG pour avis' },
    { statutDepart: 'projet_reponse_en_cours', endpoint: 'soumettre-projet-reponse', libelle: 'Soumettre le projet de réponse' },
  ],
  secretariat_2: [
    { statutDepart: 'signe', endpoint: 'enregistrer', libelle: 'Enregistrer' },
    { statutDepart: 'recu', necessiteAvisDg: false, endpoint: 'enregistrer', libelle: 'Enregistrer (circuit court)' },
  ],
};
