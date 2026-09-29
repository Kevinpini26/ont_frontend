import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MissionsAssistantsPage } from './MissionsAssistantsPage';
import { creerProjetReponseMission, listMesMissions, listProjetsReponseARelire } from '../api/courrierApi';

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
  listProjetsReponseARelire: vi.fn(),
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

function reponseProjets(data = [], { current_page = 1, last_page = 1, total = data.length } = {}) {
  return { data, meta: { current_page, last_page, total } };
}

beforeEach(() => {
  vi.clearAllMocks();
  listProjetsReponseARelire.mockResolvedValue(reponseProjets());
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

  test('distingue les projets nominativement soumis à la relecture et mène vers leur détail', async () => {
    listMesMissions.mockResolvedValue([mission]);
    listProjetsReponseARelire.mockResolvedValue(reponseProjets([{
      id: 43,
      objet: 'Réponse officielle',
      statut: 'projet_a_valider',
      statut_label: 'Projet en attente de validation',
      dossier_id: 6,
      en_reponse_a_courrier_id: 12,
      courrier_origine: { id: 12, numero_enregistrement: '2026-0005' },
      createur: { id: 6, name: 'Assistant DG1' },
      updated_at: '2026-10-01T08:00:00Z',
    }]));
    afficher();

    await screen.findByRole('tab', { name: 'Mes missions (1)' });
    expect(screen.getByRole('tab', { name: 'Projets à relire (1)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Projets à relire (1)' }));

    expect(await screen.findByText('Réponse officielle')).toBeInTheDocument();
    expect(screen.getByText('Rédacteur :')).toBeInTheDocument();
    expect(screen.getByText(/Soumis le \d{2}\/10\/2026 \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Examiner le projet' })).toHaveAttribute('href', '/courriers/43');
  });

  test('date de soumission absente affiche un fallback propre', async () => {
    listMesMissions.mockResolvedValue([]);
    listProjetsReponseARelire.mockResolvedValue(reponseProjets([{
      id: 44,
      objet: 'Projet sans horodatage',
      statut: 'projet_a_valider',
      statut_label: 'Projet en attente de validation',
      updated_at: null,
    }]));
    afficher();

    await screen.findByRole('tab', { name: 'Projets à relire (1)' }).then((tab) => fireEvent.click(tab));
    expect(await screen.findByText(/Date de soumission indisponible/)).toBeInTheDocument();
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  test('affiche une bannette de relecture vide sans masquer les missions', async () => {
    listMesMissions.mockResolvedValue([]);
    afficher();

    await screen.findByRole('tab', { name: 'Projets à relire (0)' });
    fireEvent.click(screen.getByRole('tab', { name: 'Projets à relire (0)' }));
    expect(await screen.findByText('Aucun projet à relire')).toBeInTheDocument();
  });

  test('parcourt les pages de la bannette à partir des métadonnées paginées', async () => {
    listMesMissions.mockResolvedValue([]);
    listProjetsReponseARelire
      .mockResolvedValueOnce(reponseProjets([{ id: 45, objet: 'Projet page 1', updated_at: null }], { current_page: 1, last_page: 2, total: 21 }))
      .mockResolvedValueOnce(reponseProjets([{ id: 46, objet: 'Projet page 2', updated_at: null }], { current_page: 2, last_page: 2, total: 21 }));
    afficher();

    fireEvent.click(await screen.findByRole('tab', { name: 'Projets à relire (21)' }));
    expect(await screen.findByText('Projet page 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(await screen.findByText('Projet page 2')).toBeInTheDocument();
    expect(screen.queryByText('Projet page 1')).not.toBeInTheDocument();
    expect(listProjetsReponseARelire).toHaveBeenLastCalledWith(2);
  });
});
