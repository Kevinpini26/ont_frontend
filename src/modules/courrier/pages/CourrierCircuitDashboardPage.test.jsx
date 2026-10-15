import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourrierCircuitDashboardPage } from './CourrierCircuitDashboardPage';

const mocks = vi.hoisted(() => ({
  getCourriersStatistiques: vi.fn(),
  listCourriers: vi.fn(),
  useAuthStore: vi.fn(),
}));

vi.mock('../api/courrierApi', () => mocks);
vi.mock('../../kernel/store/authStore', () => ({ useAuthStore: (selector) => selector({ user: { name: 'Test User' } }) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CourrierCircuitDashboardPage — erreurs de chargement', () => {
  test('affiche une erreur sûre et permet de relancer les indicateurs', async () => {
    const user = userEvent.setup();
    mocks.getCourriersStatistiques
      .mockRejectedValueOnce({ response: { status: 500, data: { message: 'SQLSTATE database credentials' } } })
      .mockRejectedValueOnce({ response: { status: 500, data: { message: 'SQLSTATE database credentials' } } });
    mocks.listCourriers.mockResolvedValue({ data: [] });

    render(<CourrierCircuitDashboardPage />);

    expect(await screen.findByText('Impossible de charger les indicateurs du circuit. Réessayez.')).toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE|database credentials/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(mocks.getCourriersStatistiques).toHaveBeenCalledTimes(2));
  });
});
