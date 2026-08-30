import { apiClient } from '../../../shared/api/client';

export async function verifierDossier(numero, nom) {
  const { data } = await apiClient.post('/public/dossiers/verifier', { numero, nom });
  return data.data;
}

export async function verifierAttestationParToken(token) {
  const { data } = await apiClient.get(`/public/attestations/token/${encodeURIComponent(token)}`);
  return data.data;
}

export async function verifierAttestationParNumero(numero, nom) {
  const { data } = await apiClient.post('/public/attestations/verifier', { numero, nom });
  return data.data;
}

export async function getDisponibiliteDemandesStage() {
  const { data } = await apiClient.get('/public/disponibilite-demandes-stage');
  return data;
}

export async function getStatistiquesPubliques() {
  const { data } = await apiClient.get('/public/statistiques');
  return data;
}

export async function deposerDemandeStage(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([cle, valeur]) => {
    if (valeur !== null && valeur !== undefined) {
      formData.append(cle, valeur);
    }
  });

  const { data } = await apiClient.post('/public/demandes-stage', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deposerCourrierExterne(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([cle, valeur]) => {
    if (valeur === null || valeur === undefined || valeur === '') return;
    formData.append(cle, cle === 'contenu' ? JSON.stringify(valeur) : valeur);
  });

  const { data } = await apiClient.post('/public/courriers-externes', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
