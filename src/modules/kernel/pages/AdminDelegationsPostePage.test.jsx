import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AdminDelegationsPostePage } from './AdminDelegationsPostePage';
import { listDelegationsPoste, revoquerDelegationPoste } from '../api/delegationsPosteApi';

vi.mock('../api/delegationsPosteApi', () => ({
  listDelegationsPoste: vi.fn(),
  revoquerDelegationPoste: vi.fn(),
}));

describe('Administration des délégations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listDelegationsPoste.mockResolvedValue([{
      id: 3, poste: 'dg', delegataire: { name: 'Agent intérimaire' },
      debut: '2026-09-27', fin: '2026-10-27', etat: 'active',
    }]);
    revoquerDelegationPoste.mockResolvedValue({ id: 3, etat: 'revoquee' });
  });

  test('exige un motif et masque la révocation après confirmation', async () => {
    render(<AdminDelegationsPostePage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Révoquer' }));
    expect(screen.getByRole('button', { name: 'Confirmer la révocation' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motif de révocation'), { target: { value: 'Retour du titulaire' } });
    listDelegationsPoste.mockResolvedValueOnce([{
      id: 3, poste: 'dg', delegataire: { name: 'Agent intérimaire' },
      debut: '2026-09-27', fin: '2026-10-27', etat: 'revoquee',
      revoquee_at: '2026-09-28', revoquee_par: { name: 'Administrateur' }, motif_revocation: 'Retour du titulaire',
    }]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la révocation' }));
    await waitFor(() => expect(revoquerDelegationPoste).toHaveBeenCalledWith(3, 'Retour du titulaire'));
    expect(await screen.findByText(/Révoquée le 2026-09-28/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Révoquer' })).not.toBeInTheDocument();
  });
});
