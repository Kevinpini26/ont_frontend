import { beforeEach, expect, test, vi } from 'vitest';
import { apiClient } from '../../../shared/api/client';
import { deposerScanOfficiel, lirePdfOfficiel, SCAN_OFFICIEL_MAX_OCTETS, validerFichierScan } from './scanOfficielApi';

vi.mock('../../../shared/api/client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

test('envoie uniquement les trois champs multipart du contrat existant', async () => {
  const fichier = new File(['%PDF-1.7 %%EOF'], 'scan.pdf', { type: 'application/pdf' });
  apiClient.post.mockResolvedValue({ data: { data: { id: 9 } } });
  await expect(deposerScanOfficiel(7, fichier, 'cle-conservee')).resolves.toEqual({ id: 9 });
  const [url, formulaire] = apiClient.post.mock.calls[0];
  expect(url).toBe('/documents-produits-direction/7/scan-officiel');
  expect([...formulaire.keys()]).toEqual(['scan', 'attestation_confirmee', 'idempotency_key']);
  expect(formulaire.get('scan')).toBe(fichier);
  expect(formulaire.get('attestation_confirmee')).toBe('true');
  expect(formulaire.get('idempotency_key')).toBe('cle-conservee');
});

test('charge les deux PDF via le client authentifié avec un signal', async () => {
  const pdf = new Blob(['%PDF-'], { type: 'application/pdf' });
  apiClient.get.mockResolvedValue({ data: pdf });
  const signal = new AbortController().signal;
  await expect(lirePdfOfficiel(7, true, signal)).resolves.toBe(pdf);
  await lirePdfOfficiel(7, false, signal);
  expect(apiClient.get).toHaveBeenNthCalledWith(1, '/documents-produits-direction/7/scan-officiel', { responseType: 'blob', signal });
  expect(apiClient.get).toHaveBeenNthCalledWith(2, '/documents-produits-direction/7/pdf-officiel', { responseType: 'blob', signal });
  apiClient.get.mockResolvedValue({ data: new Blob(['{}'], { type: 'application/json' }) });
  await expect(lirePdfOfficiel(7, true)).rejects.toThrow('Réponse PDF inattendue');
});

test('vérifie type, en-tête et plafond Laravel de 15 360 Ko', async () => {
  expect(await validerFichierScan(null)).toMatch(/Sélectionnez/);
  expect(await validerFichierScan(new File(['html'], 'scan.pdf', { type: 'application/pdf' }))).toMatch(/en-tête/);
  expect(await validerFichierScan(new File(['%PDF-'], 'scan.png', { type: 'image/png' }))).toMatch(/format PDF/);
  const fichier = new File(['%PDF-'], 'scan.pdf', { type: 'application/pdf' });
  Object.defineProperty(fichier, 'size', { value: SCAN_OFFICIEL_MAX_OCTETS + 1 });
  expect(await validerFichierScan(fichier)).toMatch(/15 360/);
  const limite = new File(['%PDF-'], 'scan.pdf', { type: 'application/pdf' });
  Object.defineProperty(limite, 'size', { value: SCAN_OFFICIEL_MAX_OCTETS });
  expect(await validerFichierScan(limite)).toBe('');
});
