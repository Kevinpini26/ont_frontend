import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CentreDispatchPage } from './CentreDispatchPage';
import { ClassementArchivesPage } from './ClassementArchivesPage';
import { EnvoisOfficielsPage } from './EnvoisOfficielsPage';
import { ArchivageDossiersPage } from './ArchivageDossiersPage';
import { ActionsCourrier } from './CourrierDetailPage';
import { archiverDossier, choisirModeSortie, enregistrer, envoyerParCourriel, executerDispatch, listCentreDispatchPage, listClassementsDocuments, listCourriers, listDossiersAArchiver, rendreDisponiblePourRetrait } from '../api/courrierApi';

vi.mock('../api/courrierApi', () => ({
  enregistrer: vi.fn(), choisirModeSortie: vi.fn(), confirmerRemisePhysique: vi.fn(), envoyerParCourriel: vi.fn(), rendreDisponiblePourRetrait: vi.fn(), executerDispatch: vi.fn(), transmettreSec1: vi.fn(), listCentreDispatchPage: vi.fn(),
  listClassementsDocuments: vi.fn(), listCourriers: vi.fn(),
  archiverDossier: vi.fn(), listDossiersAArchiver: vi.fn(),
}));
const meta = { current_page: 1, last_page: 2, total: 21 };
const dispatch = { id: 1, courrier_id: 5, courrier: { objet: 'Document SEC2' }, type_destination: 'direction', type_destination_label: 'Direction', statut: 'en_attente', statut_label: 'En attente', instruction: 'Traiter' };
const afficher = (element) => render(<MemoryRouter>{element}</MemoryRouter>);
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); });

describe('Poste SEC2', () => {
  test('Réception ne repropose pas Transmettre à SEC1 après une transmission active', () => {
    afficher(<ActionsCourrier
      courrier={{
        id: 44,
        statut: 'recu',
        sens: 'entrant',
        type: 'correspondance_generale',
        mode_reception: 'depot_en_ligne',
        numero_enregistrement: '2026-0007',
        en_transit: true,
        transitions: [{ destinataire_poste: 'secretariat_1', accuse_reception_at: null }],
      }}
      user={{ id: 1, poste: 'reception' }}
      executer={vi.fn()}
    />);

    expect(screen.getByRole('heading', { name: 'Transmis à SEC1' })).toBeInTheDocument();
    expect(screen.getByText('En attente de réception par le Secrétariat 01.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transmettre à SEC1' })).not.toBeInTheDocument();
  });

  test('Réception ne repropose pas Transmettre à SEC1 après la décharge de SEC1', () => {
    afficher(<ActionsCourrier
      courrier={{
        id: 44,
        statut: 'recu',
        sens: 'entrant',
        type: 'correspondance_generale',
        mode_reception: 'depot_en_ligne',
        numero_enregistrement: '2026-0007',
        en_transit: false,
        transitions: [{ destinataire_poste: 'secretariat_1', accuse_reception_at: '2026-09-29T00:19:32Z' }],
      }}
      user={{ id: 1, poste: 'reception' }}
      executer={vi.fn()}
    />);

    expect(screen.getByRole('heading', { name: 'Transmis à SEC1' })).toBeInTheDocument();
    expect(screen.getByText('La réception par le Secrétariat 01 est confirmée.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transmettre à SEC1' })).not.toBeInTheDocument();
  });

  test('enregistre un dépôt public avec son AR automatique sans ressaisie partenaire', async () => {
    enregistrer.mockResolvedValue({ id: 44, numero_accuse_reception: 'AR-2026-000008', numero_enregistrement: '2026-00044' });
    const executer = vi.fn((action) => action());
    afficher(<ActionsCourrier
      courrier={{
        id: 44,
        statut: 'recu',
        sens: 'entrant',
        type: 'correspondance_generale',
        mode_reception: 'depot_en_ligne',
        numero_accuse_reception: 'AR-2026-000008',
        numero_enregistrement: null,
        expediteur_externe_nom: 'Partenaire',
      }}
      user={{ id: 1, poste: 'reception' }}
      executer={executer}
    />);

    expect(screen.queryByLabelText('Accusé de réception du partenaire')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(enregistrer).toHaveBeenCalledWith(44, 'externe', '', null));
  });

  test('sépare clairement le libellé de classification de sa valeur pour enregistrer un dépôt', () => {
    afficher(<ActionsCourrier
      courrier={{ id: 10, statut: 'recu', sens: 'entrant', type: 'correspondance_generale', mode_reception: 'depot_en_ligne', numero_enregistrement: null }}
      user={{ id: 1, poste: 'reception' }}
      executer={vi.fn()}
    />);

    expect(screen.getByText('Classification :')).toBeInTheDocument();
    expect(screen.getByText('Externe')).toBeInTheDocument();
  });

  test('charge les dispatchs actifs filtrés et leur deuxième page côté serveur', async () => {
    listCentreDispatchPage.mockResolvedValue({ data: [dispatch], meta });
    afficher(<CentreDispatchPage />);
    await screen.findByText('Document SEC2');
    expect(listCentreDispatchPage).toHaveBeenCalledWith({ page: 1, type: 'direction', statut: 'en_attente' });
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await waitFor(() => expect(listCentreDispatchPage).toHaveBeenCalledWith({ page: 2, type: 'direction', statut: 'en_attente' }));
  });

  test('ne présente jamais l’exécution générique pour un classement', async () => {
    listCentreDispatchPage.mockResolvedValue({ data: [{ ...dispatch, type_destination: 'classement' }], meta });
    afficher(<CentreDispatchPage />);
    await screen.findByRole('link', { name: 'Classer' });
    expect(screen.queryByRole('button', { name: 'Marquer exécuté' })).not.toBeInTheDocument();
  });

  test('présente le refus métier de réception fourni par le backend', async () => {
    listCentreDispatchPage.mockResolvedValue({ data: [dispatch], meta });
    executerDispatch.mockRejectedValue({ response: { data: { message: 'Le bordereau doit être réceptionné.' } } });
    afficher(<CentreDispatchPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Marquer exécuté' }));
    await screen.findByText('Le bordereau doit être réceptionné.');
  });

  test('classement filtré serveur, emplacement obligatoire et archive non modifiable', async () => {
    listCentreDispatchPage.mockResolvedValue({ data: [{ ...dispatch, type_destination: 'classement' }], meta });
    listClassementsDocuments.mockResolvedValue({ data: [{ id: 8, courrier_id: 6, courrier: { objet: 'Archive immuable' }, statut: 'archive', emplacement: 'Armoire' }], ...meta });
    afficher(<ClassementArchivesPage />);
    const bouton = await screen.findByRole('button', { name: 'Classer' });
    expect(bouton).toBeDisabled();
    expect(listCentreDispatchPage).toHaveBeenCalledWith({ statut: 'en_attente', type: 'classement', page: 1 });
    expect(screen.queryByRole('button', { name: 'Corriger les métadonnées' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archiver le document' })).not.toBeInTheDocument();
  });

  test('file des sorties SEC2 limitée aux actions restantes et paginée', async () => {
    listCourriers.mockResolvedValue({ data: [{ id: 7, objet: 'Réponse D', numero_depart: 'DEP-7' }], meta });
    afficher(<EnvoisOfficielsPage />);
    await screen.findByRole('link', { name: 'DEP-7 — Réponse D' });
    expect(listCourriers).toHaveBeenCalledWith({ file_sorties_sec2: true, page: 1 }, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await waitFor(() => expect(listCourriers).toHaveBeenCalledWith({ file_sorties_sec2: true, page: 2 }, expect.any(AbortSignal)));
  });

  test('D signé demande le choix explicite du mode avant toute sortie', async () => {
    choisirModeSortie.mockResolvedValue({ id: 9, mode_sortie: 'courriel' });
    const executer = vi.fn((action) => action());
    afficher(<ActionsCourrier courrier={{ id: 9, statut: 'signe', sens: 'sortant', destinataire_externe_nom: 'Partenaire', destinataire_externe_email: 'partenaire@example.test', numero_depart: 'DEP-9', peut_choisir_mode_sortie: true }} user={{ id: 1, poste: 'secretariat_2' }} executer={executer} />);
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Mode de remise' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer par courriel' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choisir le mode de remise' }));
    await waitFor(() => expect(choisirModeSortie).toHaveBeenCalledWith(9, 'courriel'));
  });

  test('un D configuré courriel présente uniquement l’action courriel', async () => {
    envoyerParCourriel.mockResolvedValue({ id: 9, statut: 'envoye' });
    const executer = vi.fn((action) => action());
    afficher(<ActionsCourrier courrier={{ id: 9, statut: 'signe', sens: 'sortant', mode_sortie: 'courriel', destinataire_externe_nom: 'Partenaire', destinataire_externe_email: 'partenaire@example.test', numero_depart: 'DEP-9', peut_envoyer_par_courriel: true }} user={{ id: 1, poste: 'secretariat_2' }} executer={executer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer par courriel' }));
    await waitFor(() => expect(envoyerParCourriel).toHaveBeenCalledWith(9));
    expect(screen.queryByRole('button', { name: 'Rendre disponible pour retrait' })).not.toBeInTheDocument();
  });

  test('un courriel envoyé laisse le retrait combiné disponible indépendamment', async () => {
    rendreDisponiblePourRetrait.mockResolvedValue({ id: 9, statut: 'envoye', retrait_disponible_at: '2026-09-29T10:35:00Z' });
    const executer = vi.fn((action) => action());
    afficher(<ActionsCourrier courrier={{ id: 9, statut: 'envoye', sens: 'sortant', mode_sortie: 'courriel_et_retrait', courriel_envoye_at: '2026-09-29T10:32:00Z', courriel_destinataire: 'partenaire@example.test', peut_rendre_disponible_pour_retrait: true }} user={{ id: 1, poste: 'secretariat_2' }} executer={executer} />);
    expect(screen.getByText(/Envoyé le/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Envoyer par courriel' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rendre disponible pour retrait' }));
    await waitFor(() => expect(rendreDisponiblePourRetrait).toHaveBeenCalledWith(9, null));
  });

  test('un retrait terminé ne repropose ni disponibilité ni confirmation', () => {
    afficher(<ActionsCourrier courrier={{ id: 9, statut: 'remis', sens: 'sortant', mode_sortie: 'courriel_et_retrait', courriel_envoye_at: '2026-09-29T10:32:00Z', courriel_destinataire: 'partenaire@example.test', retrait_disponible_at: '2026-09-29T10:35:00Z', remis_le: '2026-09-29T11:00:00Z', remis_a: 'Jean Ilunga', peut_confirmer_remise_physique: true }} user={{ id: 1, poste: 'secretariat_2' }} executer={vi.fn()} />);
    expect(screen.getByText(/Remis le/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmer la remise' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rendre disponible pour retrait' })).not.toBeInTheDocument();
  });

  test('D en attente de signature ne présente pas l’action Envoyer à SEC2', () => {
    afficher(<ActionsCourrier courrier={{
      id: 10,
      statut: 'en_attente_signature',
      sens: 'sortant',
      numero_depart: '2026-D0010',
      destinataire_externe_nom: 'Partenaire',
      pdf_a_signer_disponible: true,
    }} user={{ id: 2, poste: 'secretariat_2' }} executer={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Envoyer' })).not.toBeInTheDocument();
  });

  test('la DG voit un bouton de validation pour signature après relecture', () => {
    afficher(<ActionsCourrier
      courrier={{
        id: 99,
        statut: 'projet_a_valider',
        sens: 'sortant',
        relecture_validee_at: '2026-09-28T22:51:39Z',
        numero_depart: null,
        signe_at: null,
        pdf_disponible: false,
        projet_reponse_contenu: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texte final de la réponse' }] }] },
        destinataire_externe_nom: 'Partenaire',
        relecteur: { id: 2, name: 'DG2' },
        missions_documentaires: [],
      }}
      user={{ id: 1, poste: 'dg' }}
      executer={vi.fn((action) => action())}
    />);

    expect(screen.getByRole('button', { name: 'Valider pour signature' })).toBeInTheDocument();
  });

  test.each(['assistant_1', 'assistant_2', 'secretariat_1', 'secretariat_2'])(
    '%s ne voit pas le bouton de signature pour un projet relu',
    (poste) => {
      afficher(<ActionsCourrier
        courrier={{
          id: 99,
          statut: 'projet_a_valider',
          sens: 'sortant',
          relecture_validee_at: '2026-09-28T22:51:39Z',
          numero_depart: null,
          signe_at: null,
          pdf_disponible: false,
          relecteur: { id: 2, name: 'DG2' },
          missions_documentaires: [],
        }}
        user={{ id: 3, poste }}
        executer={vi.fn((action) => action())}
      />);

      expect(screen.queryByRole('button', { name: 'Signer la réponse' })).not.toBeInTheDocument();
    },
  );

  test('un D déjà envoyé ne présente plus la signature à la DG', () => {
    afficher(<ActionsCourrier
      courrier={{
        id: 99,
        statut: 'envoye',
        sens: 'sortant',
        numero_depart: '2026-D0099',
        signe_at: '2026-09-28T22:51:39Z',
        pdf_disponible: true,
      }}
      user={{ id: 1, poste: 'dg' }}
      executer={vi.fn((action) => action())}
    />);

    expect(screen.queryByRole('button', { name: 'Signer la réponse' })).not.toBeInTheDocument();
  });

  test('le détail classement ne propose pas le bouton historique de dispatch', () => {
    afficher(<ActionsCourrier courrier={{ id: 9, statut: 'en_dispatch', dispatchs: [{ type_destination: 'classement', statut: 'en_attente' }] }} user={{ id: 1, poste: 'secretariat_2' }} executer={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Classer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transmettre à la direction' })).not.toBeInTheDocument();
  });

  test('archivage dossier expose uniquement l’exécution et affiche les blockers métier', async () => {
    listDossiersAArchiver.mockResolvedValue({ data: [{ id: 4, libelle: 'Dossier décidé' }], ...meta });
    archiverDossier.mockRejectedValue({ response: { data: { message: 'Une mission documentaire est encore active.' } } });
    afficher(<ArchivageDossiersPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Archiver le dossier' }));
    await screen.findByText('Une mission documentaire est encore active.');
    expect(screen.queryByRole('button', { name: /Décider/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await waitFor(() => expect(listDossiersAArchiver).toHaveBeenCalledWith(2));
  });
});
