import { apiClient } from '../../../shared/api/client';

export async function listCourriers(params = {}, signal) {
  const { data } = await apiClient.get('/courriers', { params, signal });
  return data;
}

export async function getCourriersStatistiques(periode = '30j') {
  const { data } = await apiClient.get('/courriers/statistiques', { params: { periode } });
  return data;
}

export async function getCourriersStatistiquesDg(seuilJours, periode = '30j') {
  const { data } = await apiClient.get('/courriers/statistiques-dg', { params: { seuil_jours: seuilJours, periode } });
  return data;
}

export async function getCourriersStatistiquesDirection(periode = '30j', signal) {
  const { data } = await apiClient.get('/courriers/statistiques-direction', { params: { periode }, signal });
  return data;
}

export async function getCourrier(id, signal) {
  const { data } = await apiClient.get(`/courriers/${id}`, { signal });
  return data.data;
}

export async function getDossier(id, signal) {
  const { data } = await apiClient.get(`/dossiers/${id}`, { signal });
  return data.data;
}

export async function getRelationsDocumentaires(courrierId, signal) {
  const { data } = await apiClient.get(`/courriers/${courrierId}/relations`, { signal });
  return data.data;
}

export async function creerMission(courrierId, assistantId, instruction) {
  const { data } = await apiClient.post(`/courriers/${courrierId}/missions`, { assistant_id: assistantId, instruction });
  return data.data;
}

export async function demanderPreparationReponse(courrierId, assistantId, instruction) {
  const { data } = await apiClient.post(`/courriers/${courrierId}/demander-preparation-reponse`, {
    assistant_id: assistantId,
    instruction,
  });
  return data.data;
}

export async function creerProjetReponseMission(missionId, payload) {
  const { data } = await apiClient.post(`/missions-documentaires/${missionId}/projet-reponse`, payload);
  return data;
}

export async function sauvegarderProjetReponseMission(missionId, payload) {
  const { data } = await apiClient.patch(`/missions-documentaires/${missionId}/projet-reponse`, payload);
  return data.data;
}

export async function soumettreProjetReponseMission(missionId, projetReponseContenu) {
  const { data } = await apiClient.post(`/missions-documentaires/${missionId}/projet-reponse/soumettre`, {
    projet_reponse_contenu: projetReponseContenu,
  });
  return data.data;
}

export async function listMesMissions(signal) {
  const { data } = await apiClient.get('/missions-documentaires/mes-missions', { signal });
  return data.data;
}

export async function prendreMissionEnCharge(id) {
  const { data } = await apiClient.post(`/missions-documentaires/${id}/prendre-en-charge`);
  return data.data;
}

export async function retournerMission(id, compteRendu, projetReponseContenu) {
  const { data } = await apiClient.post(`/missions-documentaires/${id}/retourner`, {
    compte_rendu: compteRendu,
    projet_reponse_contenu: projetReponseContenu || undefined,
  });
  return data.data;
}

export async function annulerMission(id, motif) {
  const { data } = await apiClient.post(`/missions-documentaires/${id}/annuler`, { motif });
  return data.data;
}

/**
 * FormData (et non JSON) : nécessaire pour transporter piece_jointe. Le
 * contenu (document TipTap, un objet) est sérialisé en JSON — le backend le
 * décode via StoreCourrierRequest::prepareForValidation() avant validation.
 */
export async function createCourrier(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([cle, valeur]) => {
    if (valeur === null || valeur === undefined || valeur === '') return;
    formData.append(cle, cle === 'contenu' ? JSON.stringify(valeur) : valeur);
  });

  const { data } = await apiClient.post('/courriers', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

/**
 * Même schéma que createCourrier (FormData, contenu TipTap sérialisé en
 * JSON) — le Secrétariat 01 initie un courrier au nom de la DG, sans
 * courrier entrant déclencheur.
 */
export async function initierCourrierDg(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([cle, valeur]) => {
    if (valeur === null || valeur === undefined || valeur === '') return;
    if (cle === 'projet_reponse_contenu') {
      formData.append(cle, JSON.stringify(valeur));
    } else if (typeof valeur === 'boolean') {
      // FormData sérialise un booléen JS en la chaîne "true"/"false", que
      // la règle de validation "boolean" de ce backend n'accepte pas
      // (seulement 1/0/"1"/"0"/true/false natifs) — conversion explicite.
      formData.append(cle, valeur ? '1' : '0');
    } else {
      formData.append(cle, valeur);
    }
  });

  const { data } = await apiClient.post('/courriers/initier-dg', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function accuserReception(id) {
  const { data } = await apiClient.post(`/courriers/${id}/accuser-reception`);
  return data.data;
}

export async function validerAvantDiffusion(id) {
  const { data } = await apiClient.post(`/courriers/${id}/valider-avant-diffusion`);
  return data.data;
}

/** Après remise par la Réception, le Secrétariat 01 ouvre la phase de tri. */
export async function transmettreTri(id) {
  const { data } = await apiClient.post(`/courriers/${id}/transmettre-tri`);
  return data.data;
}

/**
 * C'est ici que le tri par degré d'urgence du Secrétariat 01 est réellement
 * effectué (voir CourrierCircuitService::transmettreEnAttenteAvisDg()) —
 * degreUrgence est obligatoire côté serveur.
 */
export async function transmettreAvisDg(id, degreUrgence) {
  const { data } = await apiClient.post(`/courriers/${id}/transmettre-avis-dg`, { degre_urgence: degreUrgence });
  return data.data;
}

/** La Réception remet à SEC1 un dossier revenu "réservé" (tour+1). */
export async function transmettreSec1(id, instruction) {
  const { data } = await apiClient.post(`/courriers/${id}/transmettre-sec1`, { instruction: instruction || undefined });
  return data.data;
}

/**
 * Lot assistants : le Secrétariat 01 transmet à la DG, à son initiative, un
 * dossier tenu au classeur d'attente (degré d'urgence normal, voir
 * transmettreAvisDg()) — jamais automatique.
 */
export async function transmettreDepuisClasseur(id) {
  const { data } = await apiClient.post(`/courriers/${id}/transmettre-depuis-classeur`);
  return data.data;
}

/**
 * Lot 3 : le Secrétariat 02 transmet un courrier imputé (avis DG favorable)
 * au secrétariat de la direction imputée à titre principal.
 */
export async function dispatcherDirection(id) {
  const { data } = await apiClient.post(`/courriers/${id}/dispatcher-direction`);
  return data.data;
}

export async function deciderDispatch(id, destinations) {
  const { data } = await apiClient.post(`/courriers/${id}/dispatchs`, { destinations });
  return data.data;
}

export async function listCentreDispatch(params = {}) {
  const { data } = await apiClient.get('/dispatchs/centre', { params });
  return data.data;
}

export async function listCentreDispatchPage(params = {}) {
  const { data } = await apiClient.get('/dispatchs/centre', { params });
  return data;
}

export async function envoyerCourrier(id, donnees) {
  const { data } = await apiClient.post(`/courriers/${id}/envoyer`, donnees);
  return data.data;
}

export async function listDossiersAArchiver(page = 1) {
  const { data } = await apiClient.get('/dossiers/a-archiver', { params: { page } });
  return data;
}

export async function listBoiteDispatchDirection() {
  const { data } = await apiClient.get('/dispatchs/boite-direction');
  return data.data;
}

export async function executerDispatch(id, referenceTransmission, preuve) {
  const formulaire = new FormData();
  if (referenceTransmission) formulaire.append('reference_transmission', referenceTransmission);
  if (preuve) formulaire.append('preuve', preuve);
  const { data } = await apiClient.post(`/dispatchs/${id}/executer`, formulaire);
  return data.data;
}

export async function accuserReceptionDispatch(id) {
  const { data } = await apiClient.post(`/dispatchs/${id}/accuser-reception`);
  return data.data;
}

export async function listTraitementsDirection() {
  const { data } = await apiClient.get('/traitements-direction');
  return data.data;
}

export async function transmettreTraitementDirecteur(id, note) {
  const { data } = await apiClient.post(`/traitements-direction/${id}/transmettre-directeur`, { note: note || null });
  return data.data;
}

export async function prendreTraitementEnCharge(id) {
  const { data } = await apiClient.post(`/traitements-direction/${id}/prendre-en-charge`);
  return data.data;
}

export async function deciderTraitementDirection(id, decision, commentaire) {
  const { data } = await apiClient.post(`/traitements-direction/${id}/decision`, { decision, commentaire: commentaire || null });
  return data.data;
}

export async function creerDocumentProduit(traitementId, objet, contenu) { const { data } = await apiClient.post(`/traitements-direction/${traitementId}/document-produit`, { objet, contenu }); return data.data; }
export async function soumettreDocumentProduit(id, payload = {}) { const { data } = await apiClient.post(`/documents-produits-direction/${id}/soumettre`, payload); return data.data; }
export async function demanderCorrectionDocumentProduit(id, motif) { const { data } = await apiClient.post(`/documents-produits-direction/${id}/demander-correction`, { motif }); return data.data; }
export async function validerDocumentProduit(id) { const { data } = await apiClient.post(`/documents-produits-direction/${id}/valider`); return data.data; }
export async function transmettreDocumentReception(id) { const { data } = await apiClient.post(`/documents-produits-direction/${id}/transmettre-reception`); return data.data; }
export async function listDocumentsProduits() { const { data } = await apiClient.get('/documents-produits-direction'); return data.data; }
export async function recevoirDocumentProduit(id) { const { data } = await apiClient.post(`/documents-produits-direction/${id}/recevoir`); return data.data; }
export async function listClassementsDocuments(page = 1) { const { data } = await apiClient.get('/classements-documents', { params: { page } }); return data; }
export async function classerDispatch(id, payload) { const { data } = await apiClient.post(`/dispatchs/${id}/classer`, payload); return data.data; }
export async function archiverClassement(id, observation) { const { data } = await apiClient.post(`/classements-documents/${id}/archiver`, { observation }); return data.data; }
export async function corrigerClassement(id, payload) { const { data } = await apiClient.post(`/classements-documents/${id}/corriger`, payload); return data.data; }
export async function deciderArchivageDossier(id) { const { data } = await apiClient.post(`/dossiers/${id}/decision-archivage`); return data.data; }
export async function archiverDossier(id) { const { data } = await apiClient.post(`/dossiers/${id}/archiver`); return data.data; }

/**
 * Remplace l'ensemble des imputations du courrier (pas un ajout
 * incrémental, voir CourrierController::imputer()) — une seule direction
 * principale ici, sans copie, l'écran ne couvrant pour l'instant que le
 * geste d'orientation qui déclenche le dispatch (Lot 3).
 */
export async function imputer(id, directionId, mention) {
  const { data } = await apiClient.post(`/courriers/${id}/imputer`, {
    imputations: [{ direction_id: directionId, mention, est_principale: true }],
  });
  return data.data;
}

/**
 * Réservé à la DG (jamais la DGA, même en intérim) : correction du degré
 * d'urgence après le tri, à tout moment, quel que soit le statut courant.
 */
export async function requalifierUrgence(id, degreUrgence) {
  const { data } = await apiClient.post(`/courriers/${id}/requalifier-urgence`, { degre_urgence: degreUrgence });
  return data.data;
}

export async function rendreAvis(id, avisDg, avisDgCommentaire) {
  const { data } = await apiClient.post(`/courriers/${id}/rendre-avis`, {
    avis_dg: avisDg,
    avis_dg_commentaire: avisDgCommentaire,
  });
  return data.data;
}

/**
 * Lot C : le signataire (DG, ou DGA en intérim) renvoie au tri un
 * courrier qui n'aurait jamais dû lui être présenté — sans incrémenter
 * le tour, jamais une faute.
 */
export async function renvoyerAuTri(id, motif) {
  const { data } = await apiClient.post(`/courriers/${id}/renvoyer-au-tri`, { motif });
  return data.data;
}

export async function soumettreProjetReponse(id, projetReponseContenu, relecteurId) {
  const { data } = await apiClient.post(`/courriers/${id}/soumettre-projet-reponse`, {
    projet_reponse_contenu: projetReponseContenu,
    relecteur_id: relecteurId,
  });
  return data.data;
}

export async function validerRelecture(id, relectureCommentaire) {
  const { data } = await apiClient.post(`/courriers/${id}/valider-relecture`, {
    relecture_commentaire: relectureCommentaire,
  });
  return data.data;
}

/**
 * Lot assistants : le relecteur désigné renvoie le projet à l'assistant
 * rédacteur — observation obligatoire côté serveur.
 */
export async function renvoyerPourCorrection(id, observation) {
  const { data } = await apiClient.post(`/courriers/${id}/renvoyer-pour-correction`, { observation });
  return data.data;
}

export async function signer(id) {
  const { data } = await apiClient.post(`/courriers/${id}/signer`);
  return data.data;
}

export async function enregistrer(id, classification, noteTechnique, accuseReceptionPartenaire) {
  const { data } = await apiClient.post(`/courriers/${id}/enregistrer`, {
    classification,
    note_technique: noteTechnique,
    accuse_reception_partenaire: accuseReceptionPartenaire,
  });
  return data.data;
}

/**
 * Lot C : transmission par lot — un bordereau unique regroupe plusieurs
 * dossiers déjà en attente d'un même poste destinataire ; une seule
 * décharge (accuserReceptionBordereauLot) débloque tous les dossiers du
 * lot d'un coup.
 */
export async function creerBordereauLot(courrierIds) {
  const { data } = await apiClient.post('/bordereaux-lot', { courrier_ids: courrierIds });
  return data.data;
}

export async function getBordereauLot(id) {
  const { data } = await apiClient.get(`/bordereaux-lot/${id}`);
  return data.data;
}

export async function accuserReceptionBordereauLot(id) {
  const { data } = await apiClient.post(`/bordereaux-lot/${id}/accuser-reception`);
  return data.data;
}

export function bordereauLotPdfUrl(id) {
  return `/bordereaux-lot/${id}/pdf`;
}

/** Lot C : statistique de justesse du tri, réservée au Secrétariat 01. */
export async function getJustesseTri() {
  const { data } = await apiClient.get('/courriers/justesse-tri');
  return data;
}

/**
 * Décore l'ancienneté des dossiers actionnables par l'utilisateur courant
 * (poste, ou relecteur désigné) — ne remplace aucun statut, voir
 * CourrierEnSouffrance côté backend. `niveau` 1-3 croissant avec le retard.
 */
export async function getCourriersEnSouffrance(signal) {
  const { data } = await apiClient.get('/courriers/en-souffrance', { signal });
  return data.data;
}

export async function listAnnotations(id) {
  const { data } = await apiClient.get(`/courriers/${id}/annotations`);
  return data.data;
}

export async function ajouterAnnotation(id, contenu) {
  const { data } = await apiClient.post(`/courriers/${id}/annotations`, { contenu });
  return data.data;
}

/** Lot 1 (numérisation) : jeton de capture mobile, à usage unique, valable 15 min. */
export async function genererJetonCapture(id, numeroSms) {
  const { data } = await apiClient.post(`/courriers/${id}/jeton-capture`, numeroSms ? { numero_sms: numeroSms } : {});
  return data;
}

/** Liste de rattrapage (Réception/administrateur) des courriers déposés sans scan disponible le jour même. */
export async function listCourriersANumeriser() {
  const { data } = await apiClient.get('/courriers/a-numeriser');
  return data.data;
}
