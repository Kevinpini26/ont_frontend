import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PosteDeTravailTriPage } from './PosteDeTravailTriPage';
import { listCourriers } from '../api/courrierApi';

vi.mock('../api/courrierApi', () => ({
  accuserReception: vi.fn(),
  accuserReceptionBordereauLot: vi.fn(),
  creerBordereauLot: vi.fn(),
  getCourriersEnSouffrance: vi.fn().mockResolvedValue([]),
  listCourriers: vi.fn(),
  transmettreAvisDg: vi.fn(),
  transmettreDepuisClasseur: vi.fn(),
  transmettreTri: vi.fn(),
}));
vi.mock('../../kernel/store/authStore', () => ({
  useAuthStore: (selecteur) => selecteur({ user: { id: 1, poste: 'secretariat_1' } }),
}));
vi.mock('../../../shared/components/ui/Toast', () => ({
  useToast: () => ({ differe: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../components/poste-de-travail/PosteDeTravail', () => ({
  PosteDeTravail: ({ bannettes, bannetteActive, onSelectionnerBannette, dossiers, barreLot }) => (
    <div>
      {bannettes.map((b) => <button key={b.id} onClick={() => onSelectionnerBannette(b.id)}>{b.label} ({b.compte})</button>)}
      <span data-testid="bannette-active">{bannetteActive}</span>
      {dossiers.map((d) => <span key={d.id}>{d.objet}</span>)}
      {barreLot}
    </div>
  ),
}));

const dossier = (id, statut) => ({
  id, objet: `Dossier ${id}`, statut, necessite_avis_dg: true,
  numero_accuse_reception: `AR-${id}`, en_transit: false,
});

describe('pagination des bannettes SEC1', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    listCourriers.mockImplementation(async ({ statut, page = 1 }) => {
      const ids = page === 1 ? Array.from({ length: 20 }, (_, i) => i + 1) : [21];
      return { data: ids.map((id) => dossier(id, statut)), meta: { total: 21, current_page: page, last_page: 2 } };
    });
  });

  test.each([
    ['Nouveaux', 'recu', 'nouveaux'],
    ['À trier', 'en_attente_tri', 'a_trier'],
    ["Classeur d'attente", 'en_attente_classeur', 'classeur'],
  ])('la bannette %s expose sa seconde page sans doublon', async (libelle, statut, cle) => {
    render(<PosteDeTravailTriPage />);
    await screen.findByRole('button', { name: `${libelle} (21)` });
    fireEvent.click(screen.getByRole('button', { name: `${libelle} (21)` }));
    await screen.findByText('Dossier 20');
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await screen.findByText('Dossier 21');
    expect(screen.queryByText('Dossier 20')).not.toBeInTheDocument();
    expect(screen.getByText('Page 2 sur 2')).toBeInTheDocument();
    expect(screen.getByTestId('bannette-active')).toHaveTextContent(cle);
    await waitFor(() => expect(listCourriers).toHaveBeenCalledWith(expect.objectContaining({ statut, page: 2 }), expect.anything()));
  });
});
