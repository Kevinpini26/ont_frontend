import { apiClient } from '../../../shared/api/client';

export async function listStagiaires(params = {}, signal) {
  const { data } = await apiClient.get('/stagiaires', { params, signal });
  return data;
}

export async function getStagiairesStatistiques(params = {}, signal) {
  const { data } = await apiClient.get('/stagiaires/statistiques', { params, signal });
  return data;
}

export async function getStagiairesAlertes(params = {}, signal) {
  const { data } = await apiClient.get('/stagiaires/alertes', { params, signal });
  return data;
}

export async function getStagiaire(id) {
  const { data } = await apiClient.get(`/stagiaires/${id}`);
  return data.data;
}

export async function examinerDossier(id) {
  const { data } = await apiClient.post(`/stagiaires/${id}/examiner-dossier`);
  return data.data;
}

export async function affecter(id, directionId, { forcer = false, justification = null } = {}) {
  const { data } = await apiClient.post(`/stagiaires/${id}/affecter`, {
    direction_id: directionId,
    forcer,
    justification,
  });
  return data.data;
}

export async function reaffecter(id, directionId, { forcer = false, justification } = {}) {
  const { data } = await apiClient.post(`/stagiaires/${id}/reaffecter`, {
    direction_id: directionId,
    forcer,
    justification,
  });
  return data.data;
}

export async function validerArrivee(id, dateDebutStage, dateFinStage) {
  const { data } = await apiClient.post(`/stagiaires/${id}/valider-arrivee`, {
    date_debut_stage: dateDebutStage,
    date_fin_stage: dateFinStage,
  });
  return data.data;
}

export async function terminerStage(id) {
  const { data } = await apiClient.post(`/stagiaires/${id}/terminer-stage`);
  return data.data;
}

export async function modifierDatesStage(id, dateDebutStage, dateFinStage) {
  const { data } = await apiClient.post(`/stagiaires/${id}/modifier-dates`, {
    date_debut_stage: dateDebutStage,
    date_fin_stage: dateFinStage,
  });
  return data.data;
}

export async function prolongerStage(id, nouvelleDateFin, motif) {
  const { data } = await apiClient.post(`/stagiaires/${id}/prolonger`, {
    nouvelle_date_fin: nouvelleDateFin,
    motif,
  });
  return data.data;
}

export async function evaluerDirection(id, grille) {
  const { data } = await apiClient.post(`/stagiaires/${id}/evaluer-direction`, { grille });
  return data.data;
}

export async function evaluerDfp(id, grille) {
  const { data } = await apiClient.post(`/stagiaires/${id}/evaluer-dfp`, { grille });
  return data.data;
}

export async function ouvrirPeriodeEvaluation(id) {
  const { data } = await apiClient.post(`/stagiaires/${id}/ouvrir-periode-evaluation`);
  return data.data;
}

export async function definirObjectifs(id, objectifs) {
  const { data } = await apiClient.post(`/stagiaires/${id}/objectifs`, { objectifs });
  return data.data;
}

export async function definirInformationsComplementaires(id, donnees) {
  const { data } = await apiClient.post(`/stagiaires/${id}/informations-complementaires`, donnees);
  return data.data;
}

export async function signerConventionDirection(id) {
  const { data } = await apiClient.post(`/stagiaires/${id}/convention/signer-direction`);
  return data.data;
}

export async function getRetourExperience(id) {
  const { data } = await apiClient.get(`/stagiaires/${id}/retour`);
  return data.data;
}

export async function listPresences(id) {
  const { data } = await apiClient.get(`/stagiaires/${id}/presences`);
  return data.data;
}

export async function enregistrerPresence(id, date, heureArrivee, heureDepart) {
  const { data } = await apiClient.post(`/stagiaires/${id}/presences`, {
    date,
    heure_arrivee: heureArrivee || undefined,
    heure_depart: heureDepart || undefined,
  });
  return data.data;
}

export async function supprimerPresence(id, date) {
  await apiClient.delete(`/stagiaires/${id}/presences/${date}`);
}

export async function listDocuments(id) {
  const { data } = await apiClient.get(`/stagiaires/${id}/documents`);
  return data.data;
}

export async function uploadDocument(id, type, fichier) {
  const formData = new FormData();
  formData.append('type', type);
  formData.append('fichier', fichier);
  const { data } = await apiClient.post(`/stagiaires/${id}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}


export async function getDisponibiliteDemandes() {
  const { data } = await apiClient.get('/stagiaires/disponibilite-demandes');
  return data;
}

export async function updateDisponibiliteDemandes(type, ouvert) {
  const { data } = await apiClient.post('/stagiaires/disponibilite-demandes', { type, ouvert });
  return data;
}

export async function importerHistoriqueStagiaires(fichier) {
  const formData = new FormData();
  formData.append('fichier', fichier);
  const { data } = await apiClient.post('/admin/stagiaires/import-historique', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
