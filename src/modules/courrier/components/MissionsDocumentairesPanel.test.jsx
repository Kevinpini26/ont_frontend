import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MissionsDocumentairesPanel } from './MissionsDocumentairesPanel';
import { demanderPreparationReponse, getCourrier } from '../api/courrierApi';

vi.mock('../api/courrierApi', () => ({
  annulerMission: vi.fn(),
  creerMission: vi.fn(),
  demanderPreparationReponse: vi.fn(),
  getCourrier: vi.fn(),
  prendreMissionEnCharge: vi.fn(),
  retournerMission: vi.fn(),
}));

vi.mock('../../kernel/api/agentsApi', () => ({
  listAgentsCircuitCourrier: vi.fn().mockResolvedValue([
    { id: 11, name: 'Assistant DG1', poste: 'assistant_1' },
    { id: 12, name: 'Assistant DG2', poste: 'assistant_2' },
    { id: 13, name: 'Assistant DGA', poste: 'assistant_dga' },
  ]),
}));

describe('décision DG de préparer une réponse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    demanderPreparationReponse.mockResolvedValue({ id: 7 });
    getCourrier.mockResolvedValue({ id: 42, statut: 'en_attente_avis_dg', missions_documentaires: [] });
  });

  test('limite le rédacteur à DG1/DG2 et crée une mission de réponse nominative', async () => {
    render(
      <MissionsDocumentairesPanel
        courrier={{ id: 42, statut: 'en_attente_avis_dg', missions_documentaires: [] }}
        user={{ id: 1, poste: 'dg', source_autorite_dg: 'titulaire' }}
        onUpdate={vi.fn()}
      />,
    );

    const select = await screen.findByLabelText(/Assistant/);
    expect(screen.getByRole('option', { name: 'Assistant DG1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Assistant DG2' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Assistant DGA' })).not.toBeInTheDocument();

    fireEvent.change(select, { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText(/Instruction/), { target: { value: 'Préparer une réponse motivée.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Préparer une réponse' }));

    await waitFor(() => expect(demanderPreparationReponse).toHaveBeenCalledWith(42, 12, 'Préparer une réponse motivée.'));
  });
});
