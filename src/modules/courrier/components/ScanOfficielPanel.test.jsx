import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { ScanOfficielPanel } from './ScanOfficielPanel';
import { useAuthStore } from '../../kernel/store/authStore';
import { getDocumentInterneAutonome, transmettreDocumentReception } from '../api/courrierApi';
import { deposerScanOfficiel, lirePdfOfficiel } from '../api/scanOfficielApi';

vi.mock('../api/courrierApi', () => ({ getDocumentInterneAutonome: vi.fn(), transmettreDocumentReception: vi.fn() }));
vi.mock('../api/scanOfficielApi', async (importOriginal) => ({
  ...await importOriginal(), deposerScanOfficiel: vi.fn(), lirePdfOfficiel: vi.fn(),
}));

const documentValide = { id: 7, origine: 'autonome', statut: 'valide', direction_id: 3, directeur_id: 12,
  soumis_at: '2026-10-13T10:00:00Z', courrier: { reference_documentaire: 'REF-7' }, historique: [] };
const documentEnregistre = { ...documentValide, statut: 'scan_enregistre', historique: [
  { action: 'document_direction.scan_officiel_depose', acteur: { name: 'Secrétaire ONT' }, date: '2026-10-13T11:00:00Z' },
] };
const documentTransmis = { ...documentEnregistre, statut: 'transmis_reception', transmis_reception_at: '2026-10-13T12:00:00Z',
  transmis_reception_par: { id: 4, name: 'Secrétaire ONT' }, historique: [
    ...documentEnregistre.historique,
    { action: 'document_direction.autonome_transmis_reception', acteur: { name: 'Secrétaire ONT' }, date: '2026-10-13T12:00:00Z' },
  ] };
const resultatDepot = { id: 10, document_produit_direction_id: 7, est_actif: true, version: 1, attestation_confirmee: true, atteste_at: '2026-10-13T11:00:00Z' };
const marqueur = 'ont:scan-officiel:4:7';

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  useAuthStore.setState({ user: { id: 4, direction_id: 3, role: 'secretariat_direction' } });
  URL.createObjectURL = vi.fn(() => 'blob:scan-prive');
  URL.revokeObjectURL = vi.fn();
});

async function preparer() {
  const user = userEvent.setup();
  await user.upload(screen.getByLabelText('Scan PDF signé et cacheté (obligatoire)'), new File(['%PDF-1.7 %%EOF'], 'signe.pdf', { type: 'application/pdf' }));
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Enregistrer le scan officiel' }));
  await screen.findByRole('dialog');
  return user;
}

test('confirme explicitement, interdit le double envoi et actualise sans modifier le statut localement', async () => {
  let terminer;
  deposerScanOfficiel.mockReturnValue(new Promise((resolve) => { terminer = resolve; }));
  getDocumentInterneAutonome.mockResolvedValue(documentEnregistre);
  const onUpdated = vi.fn();
  render(<ScanOfficielPanel document={documentValide} onUpdated={onUpdated} />);
  await preparer();
  expect(deposerScanOfficiel).not.toHaveBeenCalled();
  const bouton = screen.getByRole('button', { name: 'Confirmer le dépôt' });
  fireEvent.click(bouton);
  fireEvent.click(bouton);
  expect(deposerScanOfficiel).toHaveBeenCalledTimes(1);
  expect(deposerScanOfficiel.mock.calls[0][2]).toMatch(/^[a-f0-9-]{36}$/);
  await act(async () => terminer(resultatDepot));
  expect(await screen.findByText('Scan officiel enregistré')).toBeInTheDocument();
  expect(onUpdated).toHaveBeenCalledWith(documentEnregistre);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(sessionStorage.getItem(marqueur)).toBeNull();
});

test('permet un nouveau scan après correction et nouvelle validation du Directeur', async () => {
  const documentRevalide = {
    ...documentValide,
    correction_demandee_at: '2026-10-13T13:00:00Z',
    transmis_reception_at: '2026-10-13T12:00:00Z',
    transmis_reception_par: { id: 4, name: 'Secrétaire ONT' },
    historique: [
      ...documentEnregistre.historique,
      { action: 'document_direction.autonome_transmis_reception', acteur: { name: 'Secrétaire ONT' }, date: '2026-10-13T12:00:00Z' },
    ],
  };

  render(<ScanOfficielPanel document={documentRevalide} onUpdated={vi.fn()} />);

  expect(screen.getByLabelText('Scan PDF signé et cacheté (obligatoire)')).toBeInTheDocument();
  await preparer();
  expect(await screen.findByRole('dialog')).toHaveTextContent('Confirmer le dépôt');
});

test('503 : conserve la clé après remontage et vérifie exclusivement par GET, même si le statut reste valide', async () => {
  deposerScanOfficiel.mockRejectedValue({ response: { status: 503 } });
  getDocumentInterneAutonome.mockResolvedValue(documentValide);
  const vue = render(<ScanOfficielPanel document={documentValide} onUpdated={vi.fn()} />);
  const user = await preparer();
  await user.click(screen.getByRole('button', { name: 'Confirmer le dépôt' }));
  await screen.findByText(/Le résultat du dépôt est incertain/);
  const cle = sessionStorage.getItem(marqueur);
  expect(cle).toBe(deposerScanOfficiel.mock.calls[0][2]);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  vue.unmount();
  render(<ScanOfficielPanel document={documentValide} onUpdated={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: 'Vérifier l’état du document' }));
  await screen.findByText(/Aucun enregistrement de scan n’est confirmé/);
  expect(sessionStorage.getItem(marqueur)).toBe(cle);
  expect(deposerScanOfficiel).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test.each([401, 403, 404, 409, 422])('explique une réponse %s sans annoncer un succès', async (status) => {
  deposerScanOfficiel.mockRejectedValue({ response: { status, data: { errors: { scan: ['Le PDF est illisible.'] } } } });
  render(<ScanOfficielPanel document={documentValide} onUpdated={vi.fn()} />);
  const user = await preparer();
  await user.click(screen.getByRole('button', { name: 'Confirmer le dépôt' }));
  const messages = { 401: /session a expiré/, 403: /Accès refusé/, 404: /Accès refusé/, 409: /Un dépôt existe déjà/, 422: /Le formulaire ou le document/ };
  await screen.findByText(messages[status]);
  expect(screen.queryByText('Scan officiel enregistré')).not.toBeInTheDocument();
  expect(deposerScanOfficiel).toHaveBeenCalledTimes(1);
  if (status === 422) expect(screen.getByText('Le PDF est illisible.')).toBeInTheDocument();
  if (status === 409) expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test('une réponse perdue verrouille aussi le formulaire', async () => {
  deposerScanOfficiel.mockRejectedValue(new Error('Network Error'));
  render(<ScanOfficielPanel document={documentValide} onUpdated={vi.fn()} />);
  const user = await preparer();
  await user.click(screen.getByRole('button', { name: 'Confirmer le dépôt' }));
  await screen.findByText(/La réponse n’a pas pu être confirmée/);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(sessionStorage.getItem(marqueur)).toBeTruthy();
});

test('422 : une nouvelle confirmation du même fichier conserve la clé', async () => {
  deposerScanOfficiel.mockRejectedValue({ response: { status: 422 } });
  render(<ScanOfficielPanel document={documentValide} onUpdated={vi.fn()} />);
  const user = await preparer();
  await user.click(screen.getByRole('button', { name: 'Confirmer le dépôt' }));
  await screen.findByText(/Le formulaire ou le document/);
  await user.click(screen.getByRole('button', { name: 'Enregistrer le scan officiel' }));
  await screen.findByRole('dialog');
  await user.click(screen.getByRole('button', { name: 'Confirmer le dépôt' }));
  await screen.findByText(/Le formulaire ou le document/);
  expect(deposerScanOfficiel).toHaveBeenCalledTimes(2);
  expect(deposerScanOfficiel.mock.calls[0][2]).toBe(deposerScanOfficiel.mock.calls[1][2]);
});

test('un succès de dépôt suivi d’un échec de lecture reste enregistré et non redéposable', async () => {
  deposerScanOfficiel.mockResolvedValue(resultatDepot);
  getDocumentInterneAutonome.mockRejectedValue(new Error('Réseau indisponible'));
  render(<ScanOfficielPanel document={documentValide} onUpdated={vi.fn()} />);
  const user = await preparer();
  await user.click(screen.getByRole('button', { name: 'Confirmer le dépôt' }));
  await screen.findByText(/Le scan a été enregistré, mais/);
  expect(screen.getByText('Scan officiel enregistré')).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(sessionStorage.getItem(marqueur)).toBeTruthy();
});

test('directeur assigné : consultation authentifiée uniquement, URL révoquée à la fermeture', async () => {
  useAuthStore.setState({ user: { id: 12, direction_id: 3, role: 'directeur_direction' } });
  lirePdfOfficiel.mockResolvedValue(new Blob(['%PDF-'], { type: 'application/pdf' }));
  render(<ScanOfficielPanel document={documentEnregistre} onUpdated={vi.fn()} />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByText('Déposé par : Secrétaire ONT')).toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Consulter le scan officiel' }));
  expect(await screen.findByRole('link', { name: 'Télécharger le PDF' })).toHaveAttribute('href', 'blob:scan-prive');
  expect(lirePdfOfficiel).toHaveBeenCalledWith(7, true, expect.any(AbortSignal));
  await user.click(screen.getByRole('button', { name: 'Fermer' }));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:scan-prive');
});

test('aucun formulaire pour un directeur, une autre direction ou un document déjà enregistré', () => {
  useAuthStore.setState({ user: { id: 12, direction_id: 3, role: 'directeur_direction' } });
  const vue = render(<ScanOfficielPanel document={documentValide} onUpdated={vi.fn()} />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  act(() => useAuthStore.setState({ user: { id: 4, direction_id: 8, role: 'secretariat_direction' } }));
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Télécharger le PDF officiel' })).not.toBeInTheDocument();
  act(() => useAuthStore.setState({ user: { id: 4, direction_id: 3, role: 'secretariat_direction' } }));
  vue.rerender(<ScanOfficielPanel document={documentEnregistre} onUpdated={vi.fn()} />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test('une réponse tardive après départ ne modifie aucun document et garde le marqueur de vérification', async () => {
  let terminer;
  deposerScanOfficiel.mockReturnValue(new Promise((resolve) => { terminer = resolve; }));
  const onUpdated = vi.fn();
  const vue = render(<ScanOfficielPanel document={documentValide} onUpdated={onUpdated} />);
  const user = await preparer();
  await user.click(screen.getByRole('button', { name: 'Confirmer le dépôt' }));
  vue.unmount();
  await act(async () => terminer(resultatDepot));
  expect(onUpdated).not.toHaveBeenCalled();
  expect(getDocumentInterneAutonome).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(marqueur)).toBeTruthy();
});

test('le secrétariat confirme une seule transmission et actualise l’état serveur', async () => {
  transmettreDocumentReception.mockResolvedValue(documentTransmis);
  const onUpdated = vi.fn();
  const vue = render(<ScanOfficielPanel document={documentEnregistre} onUpdated={onUpdated} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Transmettre à la Réception' }));
  await screen.findByRole('dialog');
  expect(transmettreDocumentReception).not.toHaveBeenCalled();
  const confirmer = screen.getByRole('button', { name: 'Confirmer la transmission' });
  fireEvent.click(confirmer);
  fireEvent.click(confirmer);
  await screen.findByText('Le document signé et cacheté a été transmis à la Réception.');
  expect(transmettreDocumentReception).toHaveBeenCalledTimes(1);
  expect(transmettreDocumentReception).toHaveBeenCalledWith(7);
  expect(onUpdated).toHaveBeenCalledWith(documentTransmis);
  expect(sessionStorage.getItem('ont:transmission-reception:4:7')).toBeNull();
  vue.rerender(<ScanOfficielPanel document={documentTransmis} onUpdated={onUpdated} />);
  expect(screen.getByText('Transmis à la Réception')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Transmettre à la Réception' })).not.toBeInTheDocument();
});

test('une réponse incertaine verrouille la transmission jusqu’à vérification explicite', async () => {
  transmettreDocumentReception.mockRejectedValue(new Error('Network Error'));
  getDocumentInterneAutonome.mockResolvedValue(documentTransmis);
  const onUpdated = vi.fn();
  const vue = render(<ScanOfficielPanel document={documentEnregistre} onUpdated={onUpdated} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Transmettre à la Réception' }));
  await user.click(screen.getByRole('button', { name: 'Confirmer la transmission' }));
  await screen.findByText(/résultat de la transmission est incertain/);
  expect(sessionStorage.getItem('ont:transmission-reception:4:7')).toBe('pending');
  expect(screen.queryByRole('button', { name: 'Transmettre à la Réception' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Vérifier l’état du document' }));
  await screen.findByText('La transmission à la Réception est confirmée par le serveur.');
  expect(getDocumentInterneAutonome).toHaveBeenCalledWith(7);
  expect(onUpdated).toHaveBeenCalledWith(documentTransmis);
  expect(sessionStorage.getItem('ont:transmission-reception:4:7')).toBeNull();
  expect(transmettreDocumentReception).toHaveBeenCalledTimes(1);
  vue.rerender(<ScanOfficielPanel document={documentTransmis} onUpdated={onUpdated} />);
  expect(screen.queryByRole('button', { name: 'Transmettre à la Réception' })).not.toBeInTheDocument();
});

test('la Réception consulte uniquement le scan d’un document effectivement transmis', async () => {
  useAuthStore.setState({ user: { id: 30, role: 'agent_circuit_courrier', poste: 'reception' } });
  lirePdfOfficiel.mockResolvedValue(new Blob(['%PDF-'], { type: 'application/pdf' }));
  render(<ScanOfficielPanel document={documentTransmis} onUpdated={vi.fn()} modeReception />);
  expect(screen.queryByRole('button', { name: 'Transmettre à la Réception' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Vérifier l’état du document' })).not.toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Consulter le scan officiel' }));
  expect(await screen.findByRole('link', { name: 'Télécharger le PDF' })).toHaveAttribute('href', 'blob:scan-prive');
  expect(lirePdfOfficiel).toHaveBeenCalledWith(7, true, expect.any(AbortSignal));
  expect(getDocumentInterneAutonome).not.toHaveBeenCalled();
  expect(transmettreDocumentReception).not.toHaveBeenCalled();
});

test('la Réception ne peut pas consulter un scan avant sa transmission', () => {
  useAuthStore.setState({ user: { id: 30, role: 'agent_circuit_courrier', poste: 'reception' } });
  render(<ScanOfficielPanel document={documentEnregistre} onUpdated={vi.fn()} modeReception />);
  expect(screen.queryByRole('button', { name: 'Consulter le scan officiel' })).not.toBeInTheDocument();
});
