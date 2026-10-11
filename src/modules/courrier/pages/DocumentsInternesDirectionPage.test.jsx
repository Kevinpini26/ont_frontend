import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { listDocumentsInternesAutonomes } from '../api/courrierApi';
import { DocumentsInternesDirectionPage } from './DocumentsInternesDirectionPage';

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  disconnect() {}
});

vi.mock('../api/courrierApi', () => ({
  listDocumentsInternesAutonomes: vi.fn(),
}));

const document = (id, origine, objet) => ({
  id,
  origine,
  statut: 'brouillon',
  statut_label: 'Brouillon',
  modifie_at: '2026-05-05T10:00:00Z',
  courrier: { objet },
  tracabilite: { createur: { name: 'Secrétaire A' }, dernier_editeur: { name: 'Secrétaire B' } },
});

describe('DocumentsInternesDirectionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  }));

  test('liste uniquement les documents autonomes et utilise les métadonnées de pagination serveur', async () => {
    listDocumentsInternesAutonomes.mockResolvedValue({
      data: [document(1, 'autonome', 'Note autonome'), document(2, 'traitement_direction', 'Document historique')],
      meta: { current_page: 1, last_page: 2, total: 21 },
      links: { next: '?page=2' },
    });

    render(<MemoryRouter><DocumentsInternesDirectionPage /></MemoryRouter>);

    expect(await screen.findByText('Note autonome')).toBeInTheDocument();
    expect(screen.queryByText('Document historique')).not.toBeInTheDocument();
    expect(screen.getByText('21 résultats — page 1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Secrétaire A')).toBeInTheDocument();
    expect(screen.getByText('Secrétaire B')).toBeInTheDocument();
    expect(listDocumentsInternesAutonomes).toHaveBeenCalledWith(1, expect.any(AbortSignal));

    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await waitFor(() => expect(listDocumentsInternesAutonomes).toHaveBeenLastCalledWith(2, expect.any(AbortSignal)));
  });

  test('affiche clairement les erreurs d’accès et les états vides', async () => {
    listDocumentsInternesAutonomes.mockRejectedValue({ response: { status: 403 } });
    render(<MemoryRouter><DocumentsInternesDirectionPage /></MemoryRouter>);
    expect(await screen.findByText('Vous n’êtes pas autorisé à consulter ces documents.')).toBeInTheDocument();
    expect(screen.getByText('Documents indisponibles')).toBeInTheDocument();
  });
});
