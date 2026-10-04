import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ClassementArchivesPage } from './ClassementArchivesPage';

const mocks = vi.hoisted(() => ({
  accuserReceptionDispatch: vi.fn(),
  archiverClassement: vi.fn(),
  classerDispatch: vi.fn(),
  corrigerClassement: vi.fn(),
  listCentreDispatchPage: vi.fn(),
  listClassementsDocuments: vi.fn(),
}));

vi.mock('../api/courrierApi', () => mocks);
vi.mock('../../../shared/components/ui/Pagination', () => ({ Pagination: () => null }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ClassementArchivesPage — réception SEC2 du dispatch de classement', () => {
  test('accuse le dispatch moderne avant de permettre le classement', async () => {
    const user = userEvent.setup();
    let dispatch = {
      id: 71,
      courrier_id: 12,
      courrier: { objet: 'Réponse envoyée' },
      type_destination: 'classement',
      type_destination_label: 'Classement',
      statut: 'en_attente',
      statut_label: 'En attente',
      instruction: 'Classer après sortie complète',
      peut_accuser_reception: true,
      accuse_reception_at: null,
    };
    mocks.listCentreDispatchPage.mockImplementation(async () => ({ data: [dispatch], meta: {} }));
    mocks.listClassementsDocuments.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });
    mocks.accuserReceptionDispatch.mockImplementation(async (id) => {
      expect(id).toBe(71);
      dispatch = { ...dispatch, peut_accuser_reception: false, accuse_reception_at: '2026-10-04T12:00:00Z' };
    });
    mocks.classerDispatch.mockResolvedValue({ id: 1 });

    render(<MemoryRouter><ClassementArchivesPage /></MemoryRouter>);
    expect(await screen.findByText('À réceptionner par SEC2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer la réception' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Classer' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmer la réception' }));
    expect(await screen.findByText('Réception SEC2 confirmée')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Classer' })).toBeInTheDocument();
    await user.type(screen.getAllByRole('textbox')[1], 'Armoire C');
    fireEvent.click(screen.getByRole('button', { name: 'Classer' }));
    await waitFor(() => expect(mocks.classerDispatch).toHaveBeenCalledWith(71, { emplacement: 'Armoire C' }));
  });

  test('laisse le circuit historique sans capability de réception sur Dispatch inchangé', async () => {
    mocks.listCentreDispatchPage.mockResolvedValue({
      data: [{
        id: 72,
        courrier_id: 13,
        courrier: { objet: 'Courrier historique' },
        type_destination: 'classement',
        type_destination_label: 'Classement',
        statut: 'en_attente',
        statut_label: 'En attente',
        instruction: 'Classement historique',
        accuse_reception_at: null,
      }],
      meta: {},
    });
    mocks.listClassementsDocuments.mockResolvedValue({ data: [], current_page: 1, last_page: 1, total: 0 });

    render(<MemoryRouter><ClassementArchivesPage /></MemoryRouter>);

    expect(await screen.findByRole('button', { name: 'Classer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmer la réception' })).not.toBeInTheDocument();
  });
});