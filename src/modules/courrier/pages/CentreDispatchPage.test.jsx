import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CentreDispatchPage } from './CentreDispatchPage';

const mocks = vi.hoisted(() => ({
  accuserReception: vi.fn(),
  executerDispatch: vi.fn(),
  getDispatch: vi.fn(),
  listCentreDispatchPage: vi.fn(),
}));

vi.mock('../api/courrierApi', () => mocks);
vi.mock('../../../shared/components/ui/Pagination', () => ({ Pagination: () => null }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CentreDispatchPage — erreurs de chargement', () => {
  test('ne révèle pas les détails techniques et permet de réessayer', async () => {
    const user = userEvent.setup();
    mocks.listCentreDispatchPage
      .mockRejectedValueOnce({ response: { status: 500, data: { message: 'SQLSTATE connection details' } } })
      .mockResolvedValueOnce({ data: [], meta: {} });

    render(<MemoryRouter><CentreDispatchPage /></MemoryRouter>);

    expect(await screen.findByText('Impossible de charger les dispatchs. Réessayez.')).toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE|connection details/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(mocks.listCentreDispatchPage).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Aucun dispatch')).toBeInTheDocument();
  });
});
