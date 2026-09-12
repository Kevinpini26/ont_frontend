import { apiClient } from '../../../shared/api/client';

export async function listTableauxRepartition(params = {}, signal) {
  const { data } = await apiClient.get('/tableaux-repartition', { params, signal });
  return data;
}

export async function getTableauRepartition(id, signal) {
  const { data } = await apiClient.get(`/tableaux-repartition/${id}`, { signal });
  return data.data;
}

export async function creerTableauRepartition(periodeDebut, periodeFin) {
  const { data } = await apiClient.post('/tableaux-repartition', {
    periode_debut: periodeDebut,
    periode_fin: periodeFin,
  });
  return data.data;
}

function serialiserLigne(ligne) {
  return {
    stagiaire_id: ligne.stagiaireId,
    direction_accueil_proposee_id: ligne.directionAccueilProposeeId,
    date_debut_proposee: ligne.dateDebutProposee,
    date_fin_proposee: ligne.dateFinProposee,
    encadrant_pressenti: ligne.encadrantPressenti,
    issue_proposee: ligne.issueProposee ?? 'retenu',
    motif_non_retenu: ligne.motifNonRetenu ?? null,
    motif_non_retenu_libre: ligne.motifNonRetenuLibre ?? null,
  };
}

export async function ajouterLigneTableau(id, ligne) {
  const { data } = await apiClient.post(`/tableaux-repartition/${id}/lignes`, serialiserLigne(ligne));
  return data.data;
}

/** Lot A : "un seul geste" enregistre toutes les lignes sélectionnées. */
export async function ajouterLignesEnLotTableau(id, lignes) {
  const { data } = await apiClient.post(`/tableaux-repartition/${id}/lignes/lot`, {
    lignes: lignes.map(serialiserLigne),
  });
  return data.data;
}

/** Lot A : dossiers proposables — jamais toute la base des demandes de stage. */
export async function getDossiersEligibles(signal) {
  const { data } = await apiClient.get('/tableaux-repartition/dossiers-eligibles', { signal });
  return data.data;
}

/** Lot B : liste paramétrable, jamais figée côté frontend. */
export async function getMotifsNonRetenu(signal) {
  const { data } = await apiClient.get('/tableaux-repartition/motifs-non-retenu', { signal });
  return data.data;
}

export async function retirerLigneTableau(id, ligneId) {
  const { data } = await apiClient.delete(`/tableaux-repartition/${id}/lignes/${ligneId}`);
  return data.data;
}

export async function soumettreTableau(id) {
  const { data } = await apiClient.post(`/tableaux-repartition/${id}/soumettre`);
  return data.data;
}

export async function representerDgTableau(id) {
  const { data } = await apiClient.post(`/tableaux-repartition/${id}/representer-dg`);
  return data.data;
}

export async function rendreAvisTableau(id, approuve, observations) {
  const { data } = await apiClient.post(`/tableaux-repartition/${id}/rendre-avis`, {
    approuve,
    observations,
  });
  return data.data;
}
