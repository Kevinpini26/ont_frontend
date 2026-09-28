import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DossierDocumentsPanel } from './DossierDocumentsPanel';
import { MissionsDocumentairesPanel } from './MissionsDocumentairesPanel';
import { demanderPreparationReponse, getCourrier, getDossier, getRelationsDocumentaires } from '../api/courrierApi';

vi.mock('../api/courrierApi', () => ({
  annulerMission: vi.fn(),
  creerMission: vi.fn(),
  demanderPreparationReponse: vi.fn(),
  getCourrier: vi.fn(),
  getDossier: vi.fn(),
  getRelationsDocumentaires: vi.fn(),
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
    getDossier.mockResolvedValue({ id: 3, statut_archivage: 'actif', documents: [] });
    getRelationsDocumentaires.mockResolvedValue([]);
  });

  test('n’affiche pas un libellé « Accusé null » quand la référence est absente', async () => {
    const courrierAEntrant = {
      id: 12,
      objet: 'Courrier entrant 12',
      sens: 'entrant',
      dossier_id: 3,
    };
    getDossier.mockResolvedValue({
      id: 3,
      statut_archivage: 'actif',
      documents: [
        {
          id: 12,
          objet: 'Courrier entrant 12',
          reference_documentaire: null,
          numero_enregistrement: '2026-A0012',
          numero_depart: null,
          numero_accuse_reception: 'ACC-12',
          statut_label: 'Reçu',
        },
        {
          id: 99,
          objet: 'Réponse à : Courrier entrant 12',
          en_reponse_a_courrier_id: 12,
          reference_documentaire: null,
          numero_enregistrement: null,
          numero_depart: null,
          numero_accuse_reception: null,
          statut_label: 'Projet prêt à signer',
        },
      ],
    });

    render(
      <MemoryRouter>
        <DossierDocumentsPanel
          courrier={courrierAEntrant}
        />
      </MemoryRouter>,
    );

    const lienProjet = await screen.findByRole('link', { name: 'Réponse à : Courrier entrant 12' });
    expect(lienProjet).toHaveAttribute('href', '/courriers/99');
    expect(screen.getByText('Projet prêt à signer')).toBeInTheDocument();
    expect(screen.queryByText(/Accusé null/i)).not.toBeInTheDocument();
    expect(screen.getByText('Réf. non disponible')).toBeInTheDocument();
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
