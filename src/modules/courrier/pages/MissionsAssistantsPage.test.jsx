import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MissionsAssistantsPage } from './MissionsAssistantsPage';
import { creerProjetReponseMission, listMesMissions } from '../api/courrierApi';

const contenuSaisi = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Projet saisi par DG1.' }] }],
};

const mission = {
  id: 42,
  courrier_id: 7,
  statut: 'en_cours',
  statut_label: 'En cours',
  type: 'preparation_reponse',
  instruction: 'Préparer une réponse officielle.',
  envoyee_at: '2026-10-01T08:00:00Z',
  courrier: {
    objet: 'Demande de collaboration',
    numero_enregistrement: '2026-0005',
    expediteur_externe_nom: 'Beni mawama',
    expediteur_externe_email: 'benitomaswama@gmail.com',
  },
};

vi.mock('../api/courrierApi', () => ({
  creerProjetReponseMission: vi.fn(),
  listMesMissions: vi.fn(),
  prendreMissionEnCharge: vi.fn(),
  retournerMission: vi.fn(),
  sauvegarderProjetReponseMission: vi.fn(),
  soumettreProjetReponseMission: vi.fn(),
}));

vi.mock('../components/TipTapEditor', () => ({
  TipTapEditor: ({ onChange }) => <button type="button" onClick={() => onChange(contenuSaisi)}>Saisir le projet</button>,
}));

function afficher() {
  render(<MemoryRouter><MissionsAssistantsPage /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('création du brouillon D depuis une mission DG', () => {
  test('affiche l’erreur métier renvoyée par le backend au lieu de l’absorber', async () => {
    listMesMissions.mockResolvedValue([mission]);
    creerProjetReponseMission.mockRejectedValue({ response: { data: { message: 'Cette mission possède déjà son projet de réponse.' } } });
    afficher();

    await screen.findByRole('button', { name: 'Créer le brouillon D' });
    fireEvent.click(screen.getByRole('button', { name: 'Saisir le projet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer le brouillon D' }));

    await waitFor(() => expect(creerProjetReponseMission).toHaveBeenCalledWith(42, expect.objectContaining({ projet_reponse_contenu: contenuSaisi })));
    expect(await screen.findByText('Cette mission possède déjà son projet de réponse.')).toBeInTheDocument();
  });

  test('rafraîchit la mission et confirme la création du brouillon', async () => {
    listMesMissions.mockResolvedValueOnce([mission]).mockResolvedValueOnce([
      { ...mission, projet_courrier: { id: 99, objet: 'Réponse à : Demande de collaboration', statut: 'projet_a_rediger' } },
    ]);
    creerProjetReponseMission.mockResolvedValue({ data: { id: 42 } });
    afficher();

    await screen.findByRole('button', { name: 'Créer le brouillon D' });
    fireEvent.click(screen.getByRole('button', { name: 'Saisir le projet' }));
    fireEvent.click(screen.getByRole('button', { name: 'Créer le brouillon D' }));

    await waitFor(() => expect(screen.getByText('Le brouillon D a été créé.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Sauvegarder le brouillon' })).toBeInTheDocument();
  });
});
