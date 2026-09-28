import { apiClient } from '../../../shared/api/client';

export async function listDelegationsPoste() {
  const { data } = await apiClient.get('/delegations-poste');
  return data.data;
}

export async function revoquerDelegationPoste(id, motif) {
  const { data } = await apiClient.post(`/delegations-poste/${id}/revoquer`, { motif });
  return data.data;
}
