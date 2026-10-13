import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { DocumentsInternesReceptionPage } from './DocumentsInternesReceptionPage';
import {
  listDocumentsAutonomesTransmisReception,
  listDocumentsProduits,
} from '../api/courrierApi';

vi.mock('../api/courrierApi', () => ({
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
  listDocumentsProduits.mockResolvedValue([]);
  listDocumentsAutonomesTransmisReception.mockResolvedValue({
    data: [transmis],
    meta: { current_page: 1, last_page: 1 },
  });
});

test('charge la file dédiée et présente le scan en consultation seule', async () => {
  render(<DocumentsInternesReceptionPage />);
  expect(await screen.findByText('001/ABC/AUT/ONT/2026')).toBeInTheDocument();
  expect(screen.getByText('Documents transmis par les directions')).toBeInTheDocument();
  expect(screen.getByText('Direction productrice : Direction AUT')).toBeInTheDocument();
  expect(screen.getByText('Transmis par : Secrétariat producteur')).toBeInTheDocument();
  expect(screen.getByTestId('scan-7')).toHaveAttribute('data-mode-reception', 'true');
  expect(listDocumentsAutonomesTransmisReception).toHaveBeenCalledWith(1, expect.any(AbortSignal));
  expect(listDocumentsProduits).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Enregistrer et transmettre à SEC1' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /accepter|refuser/i })).not.toBeInTheDocument();
});
