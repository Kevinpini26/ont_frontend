import { apiClient } from '../../../shared/api/client';

// DeposerScanOfficielRequest / kernel.numerisation.plafond_ko_courrier.
export const SCAN_OFFICIEL_MAX_OCTETS = 15360 * 1024;
export const ATTESTATION_SCAN_OFFICIEL = "J'atteste avoir personnellement vérifié que le document numérisé déposé correspond au document officiel imprimé et comporte la signature manuscrite et le cachet physiques requis.";

export async function deposerScanOfficiel(id, fichier, cle) {
  const formulaire = new FormData();
  formulaire.append('scan', fichier);
  formulaire.append('attestation_confirmee', 'true');
  formulaire.append('idempotency_key', cle);
  const { data } = await apiClient.post(`/documents-produits-direction/${id}/scan-officiel`, formulaire);
  return data.data;
}

export async function lirePdfOfficiel(id, scan, signal) {
  const { data } = await apiClient.get(`/documents-produits-direction/${id}/${scan ? 'scan-officiel' : 'pdf-officiel'}`, {
    responseType: 'blob', signal,
  });
  if (!(data instanceof Blob) || !data.type.toLowerCase().includes('application/pdf')) {
    throw new Error('Réponse PDF inattendue');
  }
  return data;
}

export function erreurScanOfficiel(erreur) {
  switch (erreur.response?.status) {
    case 401: return 'Votre session a expiré. Connectez-vous à nouveau.';
    case 403:
    case 404: return 'Accès refusé ou document inaccessible.';
    case 409: return 'Un dépôt existe déjà ou cette demande est en conflit. Vérifiez l’état du document.';
    case 422: return 'Le formulaire ou le document ne satisfait pas les conditions du dépôt. Vérifiez les informations signalées.';
    case 503: return 'Le résultat du dépôt est incertain. Vérifiez l’état du document avant toute autre démarche. Aucun fichier ne sera renvoyé automatiquement.';
    default: return 'La réponse n’a pas pu être confirmée. Vérifiez l’état du document. Aucun fichier ne sera renvoyé automatiquement.';
  }
}

export async function validerFichierScan(fichier) {
  if (!fichier) return 'Sélectionnez le scan PDF signé et cacheté.';
  if (!/\.pdf$/i.test(fichier.name) || (fichier.type && fichier.type !== 'application/pdf')) return 'Sélectionnez un fichier au format PDF.';
  if (!fichier.size || fichier.size > SCAN_OFFICIEL_MAX_OCTETS) return 'Le PDF doit être non vide et ne pas dépasser 15 Mo (15 360 Ko).';
  const debut = await new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(lecteur.result);
    lecteur.onerror = reject;
    lecteur.readAsText(fichier.slice(0, 5));
  });
  return debut === '%PDF-' ? '' : 'Le fichier sélectionné ne contient pas un en-tête PDF valide.';
}
