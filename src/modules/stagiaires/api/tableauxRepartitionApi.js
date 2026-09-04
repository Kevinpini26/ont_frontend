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

export async function ajouterLigneTableau(id, ligne) {
  const { data } = await apiClient.post(`/tableaux-repartition/${id}/lignes`, {
    stagiaire_id: ligne.stagiaireId,
    direction_accueil_proposee_id: ligne.directionAccueilProposeeId,
    date_debut_proposee: ligne.dateDebutProposee,
    date_fin_proposee: ligne.dateFinProposee,
    encadrant_pressenti: ligne.encadrantPressenti,
  });
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
