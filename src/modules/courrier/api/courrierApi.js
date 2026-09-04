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

export async function transmettreProtocole(id) {
  const { data } = await apiClient.post(`/courriers/${id}/transmettre-protocole`);
  return data.data;
}

/**
 * Chemin par défaut depuis "recu" (voir transmettreProtocole, inatteignable
 * en pratique tant qu'aucune catégorie n'exige le Protocole) : la Réception
 * transmet directement au tri du Secrétariat 01.
 */
export async function transmettreTri(id) {
  const { data } = await apiClient.post(`/courriers/${id}/transmettre-tri`);
  return data.data;
}

/** Si le Protocole a malgré tout été emprunté, il transmet aussi au tri. */
export async function transmettreAuTriDepuisProtocole(id) {
  const { data } = await apiClient.post(`/courriers/${id}/transmettre-au-tri-depuis-protocole`);
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

/** La Réception représente à la DG un dossier revenu "réservé" (tour+1). */
export async function representerDg(id) {
  const { data } = await apiClient.post(`/courriers/${id}/representer-dg`);
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

export async function listAnnotations(id) {
  const { data } = await apiClient.get(`/courriers/${id}/annotations`);
  return data.data;
}

export async function ajouterAnnotation(id, contenu) {
  const { data } = await apiClient.post(`/courriers/${id}/annotations`, { contenu });
  return data.data;
}
