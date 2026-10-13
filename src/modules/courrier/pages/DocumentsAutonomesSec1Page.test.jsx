import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import {
  getEtatAutonomeSec1,
  listDocumentsAutonomesAcceptesSec1,
  prendreEnChargeAutonomeSec1,
  transmettreAutonomeDgDepuisSec1,
} from '../api/courrierApi';
import { DocumentsAutonomesSec1Page } from './DocumentsAutonomesSec1Page';

vi.mock('../api/courrierApi', () => ({
  getEtatAutonomeSec1: vi.fn(),
  listDocumentsAutonomesAcceptesSec1: vi.fn(),
  prendreEnChargeAutonomeSec1: vi.fn(),
  transmettreAutonomeDgDepuisSec1: vi.fn(),
}));
vi.mock('../../../shared/components/DocumentPreviewModal', () => ({
  DocumentPreviewModal: ({ open, title, url }) => open ? <div data-testid="preview" data-url={url}>{title}</div> : null,
}));

const recu = {
  id: 9,
  origine: 'autonome',
  statut: 'entre_circuit',
  recu_at: '2026-10-14T10:00:00Z',
  recu_par: { id: 4, name: 'Agent Réception' },
  direction: { nom: 'Direction AUT' },
  direction_destination_souhaitee: { nom: 'Direction Générale' },
  courrier: {
    id: 27,
    objet: 'Note officielle',
    statut: 'recu',
    numero_enregistrement: '2026-0007',
    reference_documentaire: '001/ABC/AUT/ONT/2026',
    direction_origine: { nom: 'Direction AUT' },
    transitions: [{
      nouveau_statut: 'recu',
      destinataire_poste: 'secretariat_1',
      accuse_reception_at: null,
      accuse_reception_par: null,
    }],
  },
};

const prisEnCharge = {
  ...recu,
  courrier: {
    ...recu.courrier,
    transitions: [{
      ...recu.courrier.transitions[0],
      accuse_reception_at: '2026-10-14T11:00:00Z',
      accuse_reception_par: 'Agent SEC1',
    }],
  },
};

const transmisDg = {
  ...prisEnCharge,
  courrier: {
    ...prisEnCharge.courrier,
    statut: 'en_attente_avis_dg',
    transitions: [
      ...prisEnCharge.courrier.transitions,
      {
        nouveau_statut: 'en_attente_avis_dg',
        emetteur: 'Agent SEC1',
        created_at: '2026-10-14T12:00:00Z',
      },
    ],
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
  listDocumentsAutonomesAcceptesSec1.mockResolvedValue({
    data: [recu],
    meta: { current_page: 1, last_page: 1 },
  });
});

test('affiche la file acceptée, l’identité, la référence, le numéro et les pièces en accès privé', async () => {
  render(<DocumentsAutonomesSec1Page />);

  expect(await screen.findByText('2026-0007')).toBeInTheDocument();
  expect(screen.getByText(/Référence 001\/ABC\/AUT\/ONT\/2026/)).toBeInTheDocument();
  expect(screen.getAllByText(/Agent Réception/)).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Prendre en charge' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Consulter le scan signé et cacheté' }));
  expect(screen.getByTestId('preview')).toHaveAttribute('data-url', '/documents-produits-direction/9/scan-officiel');
  expect(listDocumentsAutonomesAcceptesSec1).toHaveBeenCalledWith(1, expect.any(AbortSignal));
});

test('confirme la prise en charge puis la transmission explicite à la DG', async () => {
  listDocumentsAutonomesAcceptesSec1
    .mockResolvedValueOnce({ data: [recu], meta: { current_page: 1, last_page: 1 } })
    .mockResolvedValueOnce({ data: [prisEnCharge], meta: { current_page: 1, last_page: 1 } })
    .mockResolvedValueOnce({ data: [transmisDg], meta: { current_page: 1, last_page: 1 } });
  prendreEnChargeAutonomeSec1.mockResolvedValue(prisEnCharge);
  transmettreAutonomeDgDepuisSec1.mockResolvedValue(transmisDg);

  render(<DocumentsAutonomesSec1Page />);
  fireEvent.click(await screen.findByRole('button', { name: 'Prendre en charge' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('Confirmer la prise en charge');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer la prise en charge' }));

  fireEvent.click(await screen.findByRole('button', { name: 'Transmettre à la DG' }));
  expect(await screen.findByRole('dialog')).toHaveTextContent('Cette action ne simule ni ne préjuge une décision');
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer la transmission' }));

  expect(await screen.findByText((_, element) => element.tagName === 'LI' && element.textContent.includes('Transmis à la DG par Agent SEC1'))).toBeInTheDocument();
  expect(transmettreAutonomeDgDepuisSec1).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Aucune décision n’a été prise automatiquement/)).toBeInTheDocument();
});

test('après une réponse incertaine, vérifie l’état sans renvoyer l’action', async () => {
  prendreEnChargeAutonomeSec1.mockRejectedValueOnce(new Error('network failure'));
  getEtatAutonomeSec1.mockResolvedValue(recu);

  render(<DocumentsAutonomesSec1Page />);
  fireEvent.click(await screen.findByRole('button', { name: 'Prendre en charge' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmer la prise en charge' }));

  fireEvent.click(await screen.findByRole('button', { name: 'Vérifier l’état' }));
  await waitFor(() => expect(getEtatAutonomeSec1).toHaveBeenCalledWith(9));
  expect(prendreEnChargeAutonomeSec1).toHaveBeenCalledTimes(1);
});
