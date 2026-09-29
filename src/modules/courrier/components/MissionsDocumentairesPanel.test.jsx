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
vi.mock('../../kernel/store/authStore', () => ({
  useAuthStore: (selector) => selector({ user: { id: 1, name: 'DG', poste: 'dg' } }),
}));
vi.mock('../../kernel/hooks/useDgAutorite', () => ({ useDgAutorite: () => true }));

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
          statut: 'projet_a_valider',
          relecture_validee_at: null,
          statut_label: 'Projet en attente de validation',
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
    expect(screen.getByText('Projet en attente de validation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Décider l’archivage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Décider l’archivage' })).toBeInTheDocument();
    expect(screen.queryByText(/Accusé null/i)).not.toBeInTheDocument();
    expect(screen.getByText('Courrier #99')).toBeInTheDocument();
  });

  test('rafraîchit le statut du D à la validation puis à l’envoi et priorise le numéro de départ', async () => {
    const dossierAvecD = (document) => ({
      id: 3,
      statut_archivage: 'actif',
      documents: [{
        id: 99,
        objet: 'Réponse à : Courrier entrant 12',
        numero_enregistrement: null,
        numero_depart: null,
        numero_accuse_reception: null,
        reference_documentaire: null,
        ...document,
      }],
    });
    getDossier
      .mockResolvedValueOnce(dossierAvecD({ statut: 'projet_a_valider', relecture_validee_at: null, statut_label: 'Projet en attente de validation' }))
      .mockResolvedValueOnce(dossierAvecD({ statut: 'projet_a_valider', relecture_validee_at: '2026-09-29T00:26:57Z', statut_label: 'Projet en attente de validation' }))
      .mockResolvedValueOnce(dossierAvecD({ statut: 'signe', numero_enregistrement: '2026-00046', numero_depart: '2026-D0003', statut_label: 'Signé' }))
      .mockResolvedValueOnce(dossierAvecD({ statut: 'envoye', relecture_validee_at: '2026-09-29T00:26:57Z', numero_enregistrement: '2026-00046', numero_depart: '2026-D0003', statut_label: 'Signé' }));

    const courrierA = { id: 12, dossier_id: 3, updated_at: '2026-09-29T00:10:00Z' };
    const { rerender } = render(<MemoryRouter><DossierDocumentsPanel courrier={courrierA} /></MemoryRouter>);
    expect(await screen.findByText('Projet en attente de validation')).toBeInTheDocument();
    expect(screen.getByText('Courrier #99')).toBeInTheDocument();

    rerender(<MemoryRouter><DossierDocumentsPanel courrier={{ ...courrierA, updated_at: '2026-09-29T00:26:57Z' }} /></MemoryRouter>);
    expect(await screen.findByText('Projet prêt à signer')).toBeInTheDocument();

    rerender(<MemoryRouter><DossierDocumentsPanel courrier={{ ...courrierA, updated_at: '2026-09-29T00:27:10Z' }} /></MemoryRouter>);
    expect(await screen.findByText('Signé')).toBeInTheDocument();
    expect(screen.getByText('Départ 2026-D0003')).toBeInTheDocument();

    rerender(<MemoryRouter><DossierDocumentsPanel courrier={{ ...courrierA, updated_at: '2026-09-29T00:36:21Z' }} /></MemoryRouter>);
    expect(await screen.findByText('Envoyé')).toBeInTheDocument();
    expect(screen.getByText('Départ 2026-D0003')).toBeInTheDocument();
    expect(screen.queryByText('Enreg. 2026-00046')).not.toBeInTheDocument();
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

  test('transit DG masque les actions mission et archivage tout en gardant les documents visibles', async () => {
    getDossier.mockResolvedValue({
      id: 3,
      statut_archivage: 'actif',
      documents: [{ id: 12, objet: 'Courrier entrant', statut: 'en_attente_avis_dg', statut_label: 'En attente d’avis DG' }],
    });
    render(
      <MemoryRouter>
        <DossierDocumentsPanel courrier={{ id: 12, dossier_id: 3, en_transit: true }} autoriserActions={false} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Courrier entrant')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Décider l’archivage' })).not.toBeInTheDocument();
  });

  test('l’autorité ne peut pas préparer une réponse avant la décharge du courrier', () => {
    render(
      <MissionsDocumentairesPanel
        courrier={{ id: 42, statut: 'en_attente_avis_dg', missions_documentaires: [] }}
        user={{ id: 1, poste: 'dg', source_autorite_dg: 'titulaire' }}
        onUpdate={vi.fn()}
        autoriserActions={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Préparer une réponse' })).not.toBeInTheDocument();
  });
});
