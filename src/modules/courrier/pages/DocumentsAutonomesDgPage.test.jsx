import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  deciderAutonomeDg,
  getEtatAutonomeDg,
  listDocumentsAutonomesEnAttenteDg,
} from '../api/courrierApi';
import { listDirections } from '../../kernel/api/directionsApi';
import { DocumentsAutonomesDgPage } from './DocumentsAutonomesDgPage';

vi.mock('../api/courrierApi', () => ({
  deciderAutonomeDg: vi.fn(),
  getEtatAutonomeDg: vi.fn(),
  listDocumentsAutonomesEnAttenteDg: vi.fn(),
}));
vi.mock('../../kernel/api/directionsApi', () => ({
  listDirections: vi.fn(),
}));
vi.mock('../../../shared/components/DocumentPreviewModal', () => ({
  DocumentPreviewModal: ({ open, title, url }) => open ? <div data-testid="preview" data-url={url}>{title}</div> : null,
}));

const documentEnAttente = {
  id: 19,
  direction: { id: 3, nom: 'Direction productrice' },
  direction_destination_souhaitee: { id: 5, nom: 'Direction souhaitée' },
  courrier: {
    id: 42,
    objet: 'Note officielle',
    statut: 'en_attente_avis_dg',
    numero_enregistrement: '2026-0019',
    reference_documentaire: '019/ABC/DIR/ONT/2026',
    direction_origine: { nom: 'Direction productrice' },
    direction_destination: null,
    dispatchs: [],
    transitions: [{ nouveau_statut: 'en_attente_avis_dg', created_at: '2026-10-14T10:00:00Z' }],
  },
  historique: [{ action: 'document_direction.autonome_transmis_dg_sec1', acteur: { name: 'Agent SEC1' }, date: '2026-10-14T10:00:00Z' }],
};

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  listDocumentsAutonomesEnAttenteDg.mockResolvedValue({
    data: [documentEnAttente],
    meta: { current_page: 1, last_page: 1 },
  });
  listDirections.mockResolvedValue([
    { id: 5, nom: 'Direction souhaitée', actif: true, est_operationnelle: true },
    { id: 8, nom: 'Direction alternative', actif: true, est_operationnelle: true },
  ]);
});

test('affiche référence, numéro, destination et permet la consultation authentifiée des fichiers', async () => {
  render(<DocumentsAutonomesDgPage />);

  expect(await screen.findByText('2026-0019')).toBeInTheDocument();
  expect(screen.getByText(/019\/ABC\/DIR\/ONT\/2026/)).toBeInTheDocument();
  expect(screen.getAllByText('Direction souhaitée')).not.toHaveLength(0);
  expect(screen.getByText(/Agent SEC1/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Consulter le PDF officiel' }));
  expect(screen.getByTestId('preview')).toHaveAttribute('data-url', '/documents-produits-direction/19/pdf-officiel');
});

test('exige un motif de réorientation et confirme la décision avant transmission à SEC2', async () => {
  deciderAutonomeDg.mockResolvedValue({
    ...documentEnAttente,
    courrier: {
      ...documentEnAttente.courrier,
      statut: 'en_dispatch',
      direction_destination: { id: 8, nom: 'Direction alternative' },
      dispatchs: [{ direction: { id: 8, nom: 'Direction alternative' }, instruction: 'Réorientation motivée' }],
    },
  });

  render(<DocumentsAutonomesDgPage />);
  const direction = await screen.findByLabelText('Direction destinataire');
  fireEvent.change(direction, { target: { value: '8' } });

  expect(screen.getByLabelText('Justification obligatoire')).toBeRequired();
  const boutonDecision = screen.getByRole('button', { name: 'Confirmer la décision' });
  expect(boutonDecision).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Justification obligatoire'), { target: { value: 'Compétence de la direction alternative' } });
  fireEvent.click(boutonDecision);

  expect(await screen.findByRole('dialog')).toHaveTextContent('justification sera conservée');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer et transmettre à SEC2' }));

  await waitFor(() => expect(deciderAutonomeDg).toHaveBeenCalledWith(19, {
    direction_id: 8,
    motif_reorientation: 'Compétence de la direction alternative',
  }));
  expect(await screen.findByText(/Décision enregistrée/)).toBeInTheDocument();
});

test('une réponse incertaine invite à vérifier sans répéter automatiquement la décision', async () => {
  deciderAutonomeDg.mockRejectedValueOnce(new Error('network failure'));
  getEtatAutonomeDg.mockResolvedValue({
    ...documentEnAttente,
    courrier: { ...documentEnAttente.courrier, statut: 'en_dispatch' },
  });

  render(<DocumentsAutonomesDgPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmer la décision' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer et transmettre à SEC2' }));

  fireEvent.click(await screen.findByRole('button', { name: 'Vérifier l’état' }));
  await waitFor(() => expect(getEtatAutonomeDg).toHaveBeenCalledWith(19));
  expect(deciderAutonomeDg).toHaveBeenCalledTimes(1);
});
