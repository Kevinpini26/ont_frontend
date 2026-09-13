import { apiClient } from '../../../shared/api/client';

export async function getCaptureInfo(token) {
  const { data } = await apiClient.get(`/public/capture/${encodeURIComponent(token)}`);
  return data;
}

/**
 * @param {string} token
 * @param {Blob} pdf déjà assemblé côté client (voir assemblerPdfNumerise)
 * @param {number} nombrePages annoncé par le client — comparé au nombre réel détecté côté serveur pour évaluer la qualité
 */
export async function soumettreCapture(token, pdf, nombrePages) {
  const formData = new FormData();
  formData.append('fichier', pdf, 'numerisation.pdf');
  formData.append('nombre_pages_annonce', nombrePages);

  const { data } = await apiClient.post(`/public/capture/${encodeURIComponent(token)}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
