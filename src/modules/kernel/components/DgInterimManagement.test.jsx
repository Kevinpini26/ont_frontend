import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DgInterimManagement } from './DgInterimManagement';
import { useAuthStore } from '../store/authStore';
import { getDgAutorite, listDgInterims, updateDgDisponibilite } from '../api/dgDisponibiliteApi';
import { listAgentsCircuitCourrier } from '../api/agentsApi';

vi.mock('../api/dgDisponibiliteApi', () => ({
  getDgAutorite: vi.fn(), listDgInterims: vi.fn(), updateDgDisponibilite: vi.fn(),
}));
vi.mock('../api/agentsApi', () => ({ listAgentsCircuitCourrier: vi.fn() }));

describe('Gestion institutionnelle de l’intérim DG', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { id: 1, role: 'agent_circuit_courrier', poste: 'dg' } });
    getDgAutorite.mockResolvedValue({ disponible: true, source_autorite: 'titulaire', interim: null });
    listDgInterims.mockResolvedValue([]);
    listAgentsCircuitCourrier.mockResolvedValue([{ id: 2, name: 'DGA', poste: 'dga' }, { id: 3, name: 'SEC2', poste: 'secretariat_2' }]);
    updateDgDisponibilite.mockResolvedValue({ disponible: false });
  });

  test('exige un DGA nommé et un motif non vide pour ouvrir', async () => {
    render(<DgInterimManagement />);
    const bouton = await screen.findByRole('button', { name: 'Ouvrir l’intérim' });
    expect(bouton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('DGA intérimaire'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Motif institutionnel'), { target: { value: 'Mission officielle' } });
    expect(bouton).toBeEnabled();
    fireEvent.click(bouton);
    await waitFor(() => expect(updateDgDisponibilite).toHaveBeenCalledWith(false, {
      dga_interimaire_id: 2, motif: 'Mission officielle',
    }));
  });

  test('affiche la période active et laisse le titulaire la terminer', async () => {
    getDgAutorite.mockResolvedValue({ disponible: false, interim: {
      id: 7, dg_titulaire: { name: 'DG' }, dga_interimaire: { name: 'DGA' },
      motif: 'Congé officiel', started_at: '2026-09-28T09:00:00Z', ouvert_par: { name: 'DG' },
    } });
    render(<DgInterimManagement />);
    expect(await screen.findByText(/Congé officiel/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Terminer l’intérim' }));
    await waitFor(() => expect(updateDgDisponibilite).toHaveBeenCalledWith(true, {}));
  });

  test('DGA intérimaire voit la période mais ne peut ni ouvrir ni terminer', async () => {
    useAuthStore.setState({ user: { id: 2, role: 'agent_circuit_courrier', poste: 'dga' } });
    getDgAutorite.mockResolvedValue({ disponible: false, source_autorite: 'interim_dga', interim: {
      id: 7, dg_titulaire: { name: 'DG' }, dga_interimaire: { name: 'DGA' },
      motif: 'Congé officiel', started_at: '2026-09-28T09:00:00Z', ouvert_par: { name: 'DG' },
    } });
    render(<DgInterimManagement />);
    expect(await screen.findByText(/Congé officiel/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Terminer l’intérim' })).not.toBeInTheDocument();
    expect(listDgInterims).not.toHaveBeenCalled();
  });
});
