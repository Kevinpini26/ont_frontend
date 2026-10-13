import { beforeEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../../../shared/api/client';
import {
  creerDocumentInterneAutonome,
  getDocumentInterneAutonome,
  getEtatAutonomeSec1,
  listDocumentsAutonomesAcceptesSec1,
  listDocumentsInternesAutonomes,
  demanderCorrectionDocumentProduit,
  prendreEnChargeAutonomeSec1,
  sauvegarderDocumentInterneAutonome,
  soumettreDocumentInterneAutonome,
  transmettreAutonomeDgDepuisSec1,
  validerDocumentProduit,
} from './courrierApi';

vi.mock('../../../shared/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('API des documents internes autonomes', () => {
  beforeEach(() => vi.clearAllMocks());

  test('conserve data, meta et links et applique le filtre serveur avant pagination', async () => {
    const pagine = { data: [{ id: 1 }], meta: { current_page: 2, last_page: 3, total: 41 }, links: { next: '?page=3' } };
    apiClient.get.mockResolvedValue({ data: pagine });
    const signal = new AbortController().signal;

    await expect(listDocumentsInternesAutonomes(2, signal)).resolves.toEqual(pagine);
    expect(apiClient.get).toHaveBeenCalledWith('/documents-produits-direction', {
      params: { origine: 'autonome', page: 2 },
      signal,
    });
  });

  test('utilise uniquement les routes existantes pour détail, création et sauvegarde', async () => {
    const resultat = { data: { id: 7, origine: 'autonome' } };
    apiClient.get.mockResolvedValue({ data: resultat });
    apiClient.post.mockResolvedValue({ data: resultat });
    apiClient.patch.mockResolvedValue({ data: resultat });

    await expect(getDocumentInterneAutonome(7)).resolves.toEqual(resultat.data);
    await expect(creerDocumentInterneAutonome({ objet: 'Objet', contenu: {} })).resolves.toEqual(resultat.data);
    await expect(sauvegarderDocumentInterneAutonome(7, { objet: 'Objet', contenu: {}, version_contenu: 3 })).resolves.toEqual(resultat.data);
    await expect(soumettreDocumentInterneAutonome(7, 3)).resolves.toEqual(resultat.data);

    expect(apiClient.get).toHaveBeenCalledWith('/documents-produits-direction/7', { signal: undefined });
    expect(apiClient.post).toHaveBeenCalledWith('/documents-produits-direction/autonomes', { objet: 'Objet', contenu: {} });
    expect(apiClient.patch).toHaveBeenCalledWith('/documents-produits-direction/7/brouillon', {
      objet: 'Objet',
      contenu: {},
      version_contenu: 3,
    });
    expect(apiClient.post).toHaveBeenLastCalledWith('/documents-produits-direction/7/soumettre', { version_contenu: 3 });
  });

  test('utilise les contrats de décision existants sans envoyer de contenu éditorial', async () => {
    const resultat = { data: { id: 7, statut: 'a_corriger', motif_correction: 'Préciser la période' } };
    apiClient.post.mockResolvedValue({ data: resultat });

    await expect(demanderCorrectionDocumentProduit(7, 'Préciser la période')).resolves.toEqual(resultat.data);
    await expect(validerDocumentProduit(7)).resolves.toEqual(resultat.data);

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/documents-produits-direction/7/demander-correction', {
      motif: 'Préciser la période',
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/documents-produits-direction/7/valider');
  });

  test('utilise les endpoints dédiés SEC1 pour la file, la prise en charge et la transmission DG', async () => {
    const element = { id: 7, statut: 'entre_circuit' };
    const resultatPagine = { data: [element], meta: { current_page: 2 } };
    const resultatDetail = { data: element };
    apiClient.get
      .mockResolvedValueOnce({ data: resultatPagine })
      .mockResolvedValueOnce({ data: resultatDetail });
    apiClient.post.mockResolvedValue({ data: resultatDetail });
    const signal = new AbortController().signal;

    await expect(listDocumentsAutonomesAcceptesSec1(2, signal)).resolves.toEqual(resultatPagine);
    await expect(getEtatAutonomeSec1(7, signal)).resolves.toEqual(element);
    await expect(prendreEnChargeAutonomeSec1(7)).resolves.toEqual(element);
    await expect(transmettreAutonomeDgDepuisSec1(7)).resolves.toEqual(element);

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/documents-produits-direction/autonomes-sec1', {
      params: { page: 2 },
      signal,
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/documents-produits-direction/7/controle-sec1', { signal });
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/documents-produits-direction/7/prendre-en-charge-sec1');
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/documents-produits-direction/7/transmettre-dg-sec1');
  });
});
