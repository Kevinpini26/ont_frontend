import { apiClient } from '../../../shared/api/client';

export async function getDgDisponibilite() {
  const { data } = await apiClient.get('/dg-disponibilite');
  return data.disponible;
}

export async function getDgAutorite() {
  const { data } = await apiClient.get('/dg-disponibilite');
  return data;
}

export async function updateDgDisponibilite(disponible, details = {}) {
  const { data } = await apiClient.post('/dg-disponibilite', { disponible, ...details });
  return data;
}

export async function listDgInterims(page = 1) {
  const { data } = await apiClient.get('/dg-interims', { params: { page } });
  return data.data;
}
