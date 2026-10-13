import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { DocumentsInternesReceptionPage } from './DocumentsInternesReceptionPage';
import {
  accepterDocumentAutonomeReception,
  demanderCorrectionDocumentAutonomeReception,
  getEtatControleReception,
  listDocumentsAutonomesTransmisReception,
  listDocumentsProduits,
} from '../api/courrierApi';

vi.mock('../api/courrierApi', () => ({
  accepterDocumentAutonomeReception: vi.fn(),
  demanderCorrectionDocumentAutonomeReception: vi.fn(),
  getEtatControleReception: vi.fn(),
  listDocumentsAutonomesTransmisReception: vi.fn(),
  listDocumentsProduits: vi.fn(),
  recevoirDocumentProduit: vi.fn(),
}));
vi.mock('../components/ScanOfficielPanel', () => ({
  ScanOfficielPanel: ({ document, modeReception }) => (
    <div data-testid={`scan-${document.id}`} data-mode-reception={modeReception}>Consultation du scan</div>
  ),
}));

const transmis = {
  id: 7,
  origine: 'autonome',
  statut: 'transmis_reception',
  valide_at: '2026-10-13T10:00:00Z',
  transmis_reception_at: '2026-10-13T12:00:00Z',
  transmis_reception_par: { id: 4, name: 'Secrétariat producteur' },
  courrier: {
    objet: 'Note signée',
    reference_documentaire: '001/ABC/AUT/ONT/2026',
    direction_origine: { nom: 'Direction AUT' },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  listDocumentsProduits.mockResolvedValue([]);
  listDocumentsAutonomesTransmisReception.mockResolvedValue({
    data: [transmis],
    meta: { current_page: 1, last_page: 1 },
  });
  accepterDocumentAutonomeReception.mockResolvedValue({
    ...transmis,
    statut: 'entre_circuit',
    recu_at: '2026-10-13T14:00:00Z',
    courrier: { ...transmis.courrier, numero_enregistrement: '2026-0001' },
  });
  demanderCorrectionDocumentAutonomeReception.mockImplementation(async (_id, motif) => ({
    ...transmis,
    statut: 'a_corriger',
    motif_correction: motif,
  }));
});

test('charge la file dédiée et présente le scan en consultation seule', async () => {
  render(<DocumentsInternesReceptionPage />);
  expect(await screen.findByText(/Référence officielle : 001\/ABC\/AUT\/ONT\/2026/)).toBeInTheDocument();
  expect(screen.getByText('Documents transmis par les directions')).toBeInTheDocument();
  expect(screen.getByText(/Direction productrice :/)).toHaveTextContent('Direction AUT');
  expect(screen.getByText('Transmis par : Secrétariat producteur')).toBeInTheDocument();
  expect(screen.getByTestId('scan-7')).toHaveAttribute('data-mode-reception', 'true');
  expect(listDocumentsAutonomesTransmisReception).toHaveBeenCalledWith(1, expect.any(AbortSignal));
  expect(listDocumentsProduits).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Enregistrer et transmettre à SEC1' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Accepter' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: /refuser/i })).not.toBeInTheDocument();
});

test('confirme l’acceptation, affiche le numéro et retire le document de la file', async () => {
  listDocumentsAutonomesTransmisReception
    .mockResolvedValueOnce({ data: [transmis], meta: { current_page: 1, last_page: 1 } })
    .mockResolvedValueOnce({ data: [], meta: { current_page: 1, last_page: 1 } });

  render(<DocumentsInternesReceptionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Accepter' }));

  expect(await screen.findByRole('dialog')).toHaveTextContent('Confirmer l’acceptation');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’acceptation' }));

  expect(await screen.findByText('2026-0001')).toBeInTheDocument();
  expect(accepterDocumentAutonomeReception).toHaveBeenCalledTimes(1);
  expect(accepterDocumentAutonomeReception).toHaveBeenCalledWith(7);
  await waitFor(() => expect(screen.queryByText(/Référence officielle : 001\/ABC\/AUT\/ONT\/2026/)).not.toBeInTheDocument());
});

test('exige un motif avant d’envoyer la demande de correction et retire le document', async () => {
  listDocumentsAutonomesTransmisReception
    .mockResolvedValueOnce({ data: [transmis], meta: { current_page: 1, last_page: 1 } })
    .mockResolvedValueOnce({ data: [], meta: { current_page: 1, last_page: 1 } });

  render(<DocumentsInternesReceptionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Demander une correction' }));

  const submit = screen.getByRole('button', { name: 'Envoyer la demande' });
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/Motif de la correction/), { target: { value: 'Date incorrecte' } });
  expect(submit).toBeEnabled();
  fireEvent.click(submit);

  expect(await screen.findByText(/Correction demandée/)).toBeInTheDocument();
  expect(demanderCorrectionDocumentAutonomeReception).toHaveBeenCalledWith(7, 'Date incorrecte');
  await waitFor(() => expect(screen.queryByText(/Référence officielle : 001\/ABC\/AUT\/ONT\/2026/)).not.toBeInTheDocument());
});

test('en cas de réponse incertaine vérifie l’état sans renvoyer la décision', async () => {
  const erreur = new Error('network failure');
  accepterDocumentAutonomeReception.mockRejectedValueOnce(erreur);
  getEtatControleReception.mockResolvedValue({ ...transmis, statut: 'transmis_reception' });

  render(<DocumentsInternesReceptionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Accepter' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’acceptation' }));

  expect(await screen.findByRole('button', { name: 'Vérifier la décision' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Vérifier la décision' }));

  expect(await screen.findByText(/toujours en attente de contrôle/)).toBeInTheDocument();
  expect(getEtatControleReception).toHaveBeenCalledWith('7');
  expect(accepterDocumentAutonomeReception).toHaveBeenCalledTimes(1);
});
