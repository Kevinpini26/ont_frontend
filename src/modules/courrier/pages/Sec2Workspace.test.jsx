import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CentreDispatchPage } from './CentreDispatchPage';
import { ClassementArchivesPage } from './ClassementArchivesPage';
import { EnvoisOfficielsPage } from './EnvoisOfficielsPage';
import { ArchivageDossiersPage } from './ArchivageDossiersPage';
import { ActionsCourrier } from './CourrierDetailPage';
import { archiverDossier, envoyerCourrier, executerDispatch, listCentreDispatchPage, listClassementsDocuments, listCourriers, listDossiersAArchiver } from '../api/courrierApi';

vi.mock('../api/courrierApi', () => ({
  envoyerCourrier: vi.fn(), executerDispatch: vi.fn(), listCentreDispatchPage: vi.fn(),
  listClassementsDocuments: vi.fn(), listCourriers: vi.fn(),
  archiverDossier: vi.fn(), listDossiersAArchiver: vi.fn(),
}));
const meta = { current_page: 1, last_page: 2, total: 21 };
const dispatch = { id: 1, courrier_id: 5, courrier: { objet: 'Document SEC2' }, type_destination: 'direction', type_destination_label: 'Direction', statut: 'en_attente', statut_label: 'En attente', instruction: 'Traiter' };
const afficher = (element) => render(<MemoryRouter>{element}</MemoryRouter>);
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); });

describe('Poste SEC2', () => {
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

  test('file officielle limitée aux sortants signés et paginée', async () => {
    listCourriers.mockResolvedValue({ data: [{ id: 7, objet: 'Réponse D', numero_depart: 'DEP-7' }], meta });
    afficher(<EnvoisOfficielsPage />);
    await screen.findByRole('link', { name: 'DEP-7 — Réponse D' });
    expect(listCourriers).toHaveBeenCalledWith({ statut: 'signe', sens: 'sortant', page: 1 }, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: 'Suivant' }));
    await waitFor(() => expect(listCourriers).toHaveBeenCalledWith({ statut: 'signe', sens: 'sortant', page: 2 }, expect.any(AbortSignal)));
  });

  test('D signé présente Envoyer, jamais Enregistrer, avec destinataire fixé', async () => {
    envoyerCourrier.mockResolvedValue({ id: 9, statut: 'envoye' });
    const executer = vi.fn((action) => action());
    afficher(<ActionsCourrier courrier={{ id: 9, statut: 'signe', sens: 'sortant', destinataire_externe_nom: 'Partenaire', destinataire_externe_email: 'partenaire@example.test', numero_depart: 'DEP-9' }} user={{ id: 1, poste: 'secretariat_2' }} executer={executer} />);
    expect(screen.queryByRole('button', { name: 'Enregistrer' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(envoyerCourrier).toHaveBeenCalledWith(9, { destinataire_externe_nom: 'Partenaire', destinataire_externe_email: 'partenaire@example.test', mode_expedition: 'courriel' }));
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
