import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { listDocumentsInternesAutonomes } from '../api/courrierApi';
import { DocumentsInternesDirecteurPage } from './DocumentsInternesDirecteurPage';

vi.mock('../api/courrierApi', () => ({
  listDocumentsInternesAutonomes: vi.fn(),
}));

const ligne = (id, statut, overrides = {}) => ({
  id,
  origine: 'autonome',
  statut,
  statut_label: statut,
  soumis_at: null,
  courrier: { objet: `Document ${id}`, reference_documentaire: null },
  ...overrides,
});

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  disconnect() {}
});

describe('DocumentsInternesDirecteurPage', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  }));

  test('affiche les résultats et statuts retournés par le serveur avec sa pagination, sans retraitement local', async () => {
    listDocumentsInternesAutonomes.mockResolvedValue({
      data: [
        ligne(1, 'soumis_directeur'),
        ligne(2, 'a_corriger'),
        ligne(3, 'brouillon', { soumis_at: '2026-05-01T10:00:00Z' }),
        ligne(4, 'brouillon'),
        ligne(5, 'valide', { courrier: { objet: 'Document 5', reference_documentaire: 'DIR-2026-001' } }),
      ],
      meta: { current_page: 1, last_page: 2, total: 21 },
    });
    render(<MemoryRouter><DocumentsInternesDirecteurPage /></MemoryRouter>);

    expect(await screen.findByText('Document 1')).toBeInTheDocument();
    expect(screen.getByText('À examiner')).toBeInTheDocument();
    expect(screen.getByText('Correction demandée')).toBeInTheDocument();
    expect(screen.getByText('Correction en préparation')).toBeInTheDocument();
    expect(screen.getByText('Brouillon — non soumis')).toBeInTheDocument();
    expect(screen.getByText('Contenu validé')).toBeInTheDocument();
    expect(screen.getByText('DIR-2026-001')).toBeInTheDocument();
    expect(screen.getAllByText('Direction indisponible')).toHaveLength(5);
    expect(screen.getByText('21 résultats — page 1 / 2')).toBeInTheDocument();
    expect(listDocumentsInternesAutonomes).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await waitFor(() => expect(listDocumentsInternesAutonomes).toHaveBeenLastCalledWith(2, expect.any(AbortSignal)));
  });

  test('présente une erreur 403 de façon non technique', async () => {
    listDocumentsInternesAutonomes.mockRejectedValue({ response: { status: 403, data: { message: 'stack trace interne' } } });
    render(<MemoryRouter><DocumentsInternesDirecteurPage /></MemoryRouter>);
    expect(await screen.findByText('Vous n’êtes pas autorisé à consulter ces documents.')).toBeInTheDocument();
    expect(screen.queryByText('stack trace interne')).not.toBeInTheDocument();
  });
});
