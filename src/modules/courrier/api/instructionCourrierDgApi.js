import { apiClient } from '../../../shared/api/client';

export async function listInstructionsCourrierDg(page = 1, signal) {
  const { data } = await apiClient.get('/instructions-courrier-dg', { params: { page }, signal });
  return data;
}

export async function creerInstructionCourrierDg(payload) {
  const { data } = await apiClient.post('/instructions-courrier-dg', payload);
  return data.data;
}

export async function ouvrirInstructionCourrierDg(id) {
  const { data } = await apiClient.get(`/instructions-courrier-dg/${id}`);
  return data.data;
}

export async function annulerInstructionCourrierDg(id) {
  const { data } = await apiClient.post(`/instructions-courrier-dg/${id}/annuler`);
  return data.data;
}
