import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  creerDocumentInterneAutonome,
  getDocumentInterneAutonome,
  sauvegarderDocumentInterneAutonome,
  soumettreDocumentInterneAutonome,
} from '../api/courrierApi';
import { ROLES } from '../../kernel/constants';
import { useAuthStore } from '../../kernel/store/authStore';
import { useToastStore } from '../../../shared/store/toastStore';
import { DocumentInterneAutonomePage } from './DocumentInterneAutonomePage';

vi.mock('../api/courrierApi', () => ({
  creerDocumentInterneAutonome: vi.fn(),
  getDocumentInterneAutonome: vi.fn(),
  sauvegarderDocumentInterneAutonome: vi.fn(),
  soumettreDocumentInterneAutonome: vi.fn(),
  transmettreDocumentReception: vi.fn(),
}));

vi.mock('../components/TipTapEditor', () => ({
  TipTapEditor: ({ content, onChange, editable = true, id }) => (
    <textarea
      id={id}
      aria-label={id === 'contenu-document-interne' ? 'Contenu' : 'Aperçu de la version serveur'}
      readOnly={!editable}
      value={content?.content?.[0]?.content?.[0]?.text ?? ''}
      onChange={(event) => onChange?.({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: event.target.value }] }],
      })}
    />
  ),
}));

const texte = (value) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] });
const documentExemple = (overrides = {}) => ({
  id: 15,
  origine: 'autonome',
  statut: 'brouillon',
  statut_label: 'Brouillon',
  version_contenu: 4,
  cree_at: '2026-05-04T08:00:00Z',
  modifie_at: '2026-05-05T10:00:00Z',
  courrier: { objet: 'Note initiale', contenu: texte('Contenu initial'), reference_documentaire: null },
  tracabilite: { createur: { name: 'Secrétaire A' }, dernier_editeur: { name: 'Secrétaire B' } },
  historique: [{ action: 'document_direction.brouillon_modifie', acteur: { name: 'Secrétaire B' }, date: '2026-05-05T10:00:00Z' }],
  ...overrides,
});

function afficherDetail() {
  const router = createMemoryRouter([
    { path: '/direction/documents-internes/:id', element: <DocumentInterneAutonomePage /> },
    { path: '/direction/documents-internes', element: <div>Liste des documents internes</div> },
  ], { initialEntries: ['/direction/documents-internes/15'] });
  return { router, ...render(<RouterProvider router={router} />) };
}

function promesseControlee() {
  let resolve;
  let reject;
  const promise = new Promise((resoudre, rejeter) => {
    resolve = resoudre;
    reject = rejeter;
  });
  return { promise, resolve, reject };
}

describe('DocumentInterneAutonomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { role: ROLES.SECRETARIAT_DIRECTION } });
    useToastStore.setState({ toasts: [] });
  });

  test('crée un brouillon avec objet et contenu sans choisir la direction', async () => {
    const user = userEvent.setup();
    creerDocumentInterneAutonome.mockResolvedValue(documentExemple({ id: 19 }));

    const router = createMemoryRouter([
      { path: '/direction/documents-internes/nouveau', element: <DocumentInterneAutonomePage /> },
      { path: '/direction/documents-internes/:id', element: <div>Document créé</div> },
      { path: '/direction/documents-internes', element: <div>Liste des documents internes</div> },
    ], { initialEntries: ['/direction/documents-internes/nouveau'] });
    render(<RouterProvider router={router} />);
    expect(screen.queryByRole('button', { name: 'Soumettre au Directeur' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Objet/), 'Nouvelle note');
    await user.type(screen.getByLabelText('Contenu'), 'Texte à conserver');
    await user.click(screen.getByRole('button', { name: 'Créer le brouillon' }));

    await waitFor(() => expect(creerDocumentInterneAutonome).toHaveBeenCalledWith({
      objet: 'Nouvelle note',
      contenu: texte('Texte à conserver'),
    }));
    expect(await screen.findByText('Document créé')).toBeInTheDocument();
  });

  test('confirme avant de quitter une création non enregistrée et permet d’annuler le départ', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      { path: '/direction/documents-internes/nouveau', element: <DocumentInterneAutonomePage /> },
      { path: '/direction/documents-internes', element: <div>Liste des documents internes</div> },
    ], { initialEntries: ['/direction/documents-internes/nouveau'] });
    render(<RouterProvider router={router} />);
    await user.type(screen.getByLabelText(/Objet/), 'Brouillon local');
    await user.click(screen.getByRole('link', { name: 'Annuler' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('Abandonner ce document non enregistré');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.getByLabelText(/Objet/)).toHaveValue('Brouillon local');

    await user.click(screen.getByRole('link', { name: 'Annuler' }));
    await user.click(screen.getByRole('button', { name: 'Abandonner' }));
    expect(await screen.findByText('Liste des documents internes')).toBeInTheDocument();
  });

  test('active le garde browser-unload uniquement pendant la saisie locale', async () => {
    const user = userEvent.setup();
    const ajout = vi.spyOn(window, 'addEventListener');
    const retrait = vi.spyOn(window, 'removeEventListener');
    const router = createMemoryRouter([
      { path: '/direction/documents-internes/nouveau', element: <DocumentInterneAutonomePage /> },
    ], { initialEntries: ['/direction/documents-internes/nouveau'] });
    const rendu = render(<RouterProvider router={router} />);
    expect(ajout.mock.calls.some(([type]) => type === 'beforeunload')).toBe(false);
    await user.type(screen.getByLabelText(/Objet/), 'Brouillon local');

    const garde = ajout.mock.calls.find(([type]) => type === 'beforeunload')?.[1];
    expect(garde).toEqual(expect.any(Function));
    rendu.unmount();
    expect(retrait).toHaveBeenCalledWith('beforeunload', garde);
    ajout.mockRestore();
    retrait.mockRestore();
  });

  test('permet la sauvegarde collaborative avec la version courante et actualise la traçabilité', async () => {
    const user = userEvent.setup();
    getDocumentInterneAutonome.mockResolvedValue(documentExemple());
    sauvegarderDocumentInterneAutonome.mockResolvedValue(documentExemple({
      version_contenu: 5,
      statut: 'brouillon',
      courrier: { objet: 'Note partagée', contenu: texte('Texte partagé') },
      tracabilite: { createur: { name: 'Secrétaire A' }, dernier_editeur: { name: 'Secrétaire C' } },
    }));

    afficherDetail();
    await screen.findByText('Historique disponible');
    await user.clear(screen.getByLabelText(/Objet/));
    await user.type(screen.getByLabelText(/Objet/), 'Note partagée');
    await user.clear(screen.getByLabelText('Contenu'));
    await user.type(screen.getByLabelText('Contenu'), 'Texte partagé');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));

    await waitFor(() => expect(sauvegarderDocumentInterneAutonome).toHaveBeenCalledWith(15, {
      objet: 'Note partagée',
      contenu: texte('Texte partagé'),
      version_contenu: 4,
    }));
    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(screen.getByText('Secrétaire C')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Retour à la liste' }));
    expect(await screen.findByText('Liste des documents internes')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('soumet avec confirmation et la version courante, puis passe en lecture seule', async () => {
    const user = userEvent.setup();
    getDocumentInterneAutonome.mockResolvedValue(documentExemple());
    soumettreDocumentInterneAutonome.mockResolvedValue(documentExemple({
      statut: 'soumis_directeur',
      statut_label: 'Soumis au Directeur',
      historique: [{ action: 'document_direction.soumis', acteur: { name: 'Secrétaire A' }, date: '2026-05-06T10:00:00Z' }],
    }));

    afficherDetail();
    const bouton = await screen.findByRole('button', { name: 'Soumettre au Directeur' });
    await user.click(bouton);
    expect(screen.getByRole('dialog')).toHaveTextContent('Soumettre ce document au Directeur pour examen');
    expect(screen.getByRole('dialog')).toHaveTextContent('ne sera plus modifiable pendant son examen');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(soumettreDocumentInterneAutonome).not.toHaveBeenCalled();

    await user.click(bouton);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));
    await waitFor(() => expect(soumettreDocumentInterneAutonome).toHaveBeenCalledWith(15, 4));
    expect(await screen.findByText('Soumis au Directeur')).toBeInTheDocument();
    expect(await screen.findByText('Document soumis')).toBeInTheDocument();
    expect(screen.queryByLabelText('Contenu')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Soumettre au Directeur' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le brouillon' })).not.toBeInTheDocument();
  });

  test('désactive la soumission tant que des modifications locales ne sont pas enregistrées', async () => {
    const user = userEvent.setup();
    getDocumentInterneAutonome.mockResolvedValue(documentExemple());
    afficherDetail();
    await screen.findByText('Historique disponible');
    await user.type(screen.getByLabelText('Contenu'), ' non enregistré');

    expect(screen.getByRole('button', { name: 'Soumettre au Directeur' })).toBeDisabled();
    expect(screen.getByText('Enregistrez vos modifications avant de soumettre le document.')).toBeInTheDocument();
    expect(soumettreDocumentInterneAutonome).not.toHaveBeenCalled();
  });

  test.each([
    ['soumis_directeur', true],
    ['valide', true],
    ['a_corriger', true],
    ['brouillon', false],
  ])('n’affiche la soumission que pour un brouillon; statut %s', async (statut, masquer) => {
    getDocumentInterneAutonome.mockResolvedValue(documentExemple({ statut }));
    afficherDetail();
    if (masquer) {
      await screen.findByText('Historique disponible');
      expect(screen.queryByRole('button', { name: 'Soumettre au Directeur' })).not.toBeInTheDocument();
    } else {
      expect(await screen.findByRole('button', { name: 'Soumettre au Directeur' })).toBeInTheDocument();
    }
  });

  test('masque la soumission aux autres rôles', async () => {
    useAuthStore.setState({ user: { role: ROLES.DIRECTEUR_DIRECTION } });
    getDocumentInterneAutonome.mockResolvedValue(documentExemple());
    afficherDetail();
    await screen.findByText('Historique disponible');
    expect(screen.queryByRole('button', { name: 'Soumettre au Directeur' })).not.toBeInTheDocument();
  });

  test('empêche une double soumission pendant la requête', async () => {
    const user = userEvent.setup();
    let terminer;
    getDocumentInterneAutonome.mockResolvedValue(documentExemple());
    soumettreDocumentInterneAutonome.mockReturnValue(new Promise((resolve) => {
      terminer = resolve;
    }));
    afficherDetail();
    await user.click(await screen.findByRole('button', { name: 'Soumettre au Directeur' }));
    const confirmation = within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' });
    await user.dblClick(confirmation);
    expect(soumettreDocumentInterneAutonome).toHaveBeenCalledTimes(1);
    expect(await within(screen.getByRole('dialog')).findByRole('button', { name: 'Patientez…' })).toBeDisabled();
    terminer(documentExemple({ statut: 'soumis_directeur', statut_label: 'Soumis au Directeur' }));
    expect(await screen.findByText('Soumis au Directeur')).toBeInTheDocument();
  });

  test('ignore le succès tardif de la soumission du document A après navigation vers B', async () => {
    const user = userEvent.setup();
    const soumissionA = promesseControlee();
    const chargementB = promesseControlee();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple({ id: 15, courrier: { objet: 'Document A', contenu: texte('Contenu A') } }))
      .mockImplementationOnce(() => chargementB.promise);
    soumettreDocumentInterneAutonome.mockReturnValue(soumissionA.promise);
    const { router } = afficherDetail();

    await user.click(await screen.findByRole('button', { name: 'Soumettre au Directeur' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));
    expect(soumettreDocumentInterneAutonome).toHaveBeenCalledWith(15, 4);

    await router.navigate('/direction/documents-internes/16');
    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2));
    chargementB.resolve(documentExemple({
      id: 16,
      courrier: { objet: 'Document B', contenu: texte('Contenu B') },
    }));
    expect(await screen.findByRole('heading', { name: 'Document B' })).toBeInTheDocument();
    soumissionA.resolve(documentExemple({
      id: 15,
      statut: 'soumis_directeur',
      statut_label: 'Document A soumis',
      courrier: { objet: 'Document A soumis', contenu: texte('Contenu A soumis') },
    }));

    await waitFor(() => expect(screen.getByText('Document B')).toBeInTheDocument());
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
    expect(screen.getByLabelText('Contenu')).toHaveValue('Contenu B');
    expect(screen.queryByText('Document A soumis')).not.toBeInTheDocument();
    expect(screen.queryByText('Document soumis au Directeur pour examen.')).not.toBeInTheDocument();
  });

  test('ignore le 409 tardif de A sans conflit ni fermeture de confirmation appartenant à B', async () => {
    const user = userEvent.setup();
    const soumissionA = promesseControlee();
    const chargementB = promesseControlee();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple({ id: 15, courrier: { objet: 'Document A', contenu: texte('Contenu A') } }))
      .mockImplementationOnce(() => chargementB.promise);
    soumettreDocumentInterneAutonome.mockReturnValue(soumissionA.promise);
    const { router } = afficherDetail();

    await user.click(await screen.findByRole('button', { name: 'Soumettre au Directeur' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));
    await router.navigate('/direction/documents-internes/16');
    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2));
    chargementB.resolve(documentExemple({
      id: 16,
      courrier: { objet: 'Document B', contenu: texte('Contenu B') },
    }));
    await user.click(await screen.findByRole('button', { name: 'Soumettre au Directeur' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    soumissionA.reject({ response: { status: 409 } });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByRole('dialog')).toHaveTextContent('Soumettre ce document au Directeur pour examen');
    expect(screen.getByLabelText('Contenu')).toHaveValue('Contenu B');
    expect(screen.queryByText(/La version ou le statut du document a changé/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consulter la version serveur' })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Annuler' }));
  });

  test('ignore une réponse de soumission reçue après le démontage', async () => {
    const user = userEvent.setup();
    const soumission = promesseControlee();
    getDocumentInterneAutonome.mockResolvedValue(documentExemple());
    soumettreDocumentInterneAutonome.mockReturnValue(soumission.promise);
    const rendu = afficherDetail();

    await user.click(await screen.findByRole('button', { name: 'Soumettre au Directeur' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));
    rendu.unmount();

    await act(async () => {
      soumission.resolve(documentExemple({
        statut: 'soumis_directeur',
        statut_label: 'Soumis au Directeur',
      }));
      await soumission.promise;
    });
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  test('ignore les résultats de chargements antérieurs arrivés après le chargement courant', async () => {
    const ancienChargementA = promesseControlee();
    const chargementB = promesseControlee();
    const chargementRecentA = promesseControlee();
    getDocumentInterneAutonome
      .mockImplementationOnce(() => ancienChargementA.promise)
      .mockImplementationOnce(() => chargementB.promise)
      .mockImplementationOnce(() => chargementRecentA.promise);
    const { router } = afficherDetail();

    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(1));
    await router.navigate('/direction/documents-internes/16');
    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2));
    await router.navigate('/direction/documents-internes/15');
    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(3));

    chargementRecentA.resolve(documentExemple({
      id: 15,
      courrier: { objet: 'Chargement récent A', contenu: texte('Version A récente') },
    }));
    expect(await screen.findByText('Chargement récent A')).toBeInTheDocument();
    ancienChargementA.resolve(documentExemple({
      id: 15,
      courrier: { objet: 'Ancien chargement A', contenu: texte('Version A ancienne') },
    }));
    chargementB.resolve(documentExemple({
      id: 16,
      courrier: { objet: 'Ancien chargement B', contenu: texte('Version B ancienne') },
    }));

    await waitFor(() => expect(screen.getByText('Chargement récent A')).toBeInTheDocument());
    expect(screen.getByLabelText('Contenu')).toHaveValue('Version A récente');
    expect(screen.queryByText('Ancien chargement A')).not.toBeInTheDocument();
    expect(screen.queryByText('Ancien chargement B')).not.toBeInTheDocument();
  });

  test('ignore la sauvegarde tardive du document A après navigation vers B', async () => {
    const user = userEvent.setup();
    const sauvegardeA = promesseControlee();
    const chargementB = promesseControlee();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple({ id: 15, courrier: { objet: 'Document A', contenu: texte('Contenu A') } }))
      .mockImplementationOnce(() => chargementB.promise);
    sauvegarderDocumentInterneAutonome.mockReturnValue(sauvegardeA.promise);
    const { router } = afficherDetail();

    await user.type(await screen.findByLabelText('Contenu'), ' modifié');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await router.navigate('/direction/documents-internes/16');
    await user.click(await screen.findByRole('button', { name: 'Abandonner' }));
    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2));
    chargementB.resolve(documentExemple({
      id: 16,
      courrier: { objet: 'Document B', contenu: texte('Contenu B') },
    }));
    expect(await screen.findByText('Document B')).toBeInTheDocument();
    sauvegardeA.resolve(documentExemple({
      id: 15,
      version_contenu: 5,
      courrier: { objet: 'Document A sauvegardé', contenu: texte('Contenu A sauvegardé') },
    }));

    await waitFor(() => expect(screen.getByText('Document B')).toBeInTheDocument());
    expect(screen.getByLabelText('Contenu')).toHaveValue('Contenu B');
    expect(screen.queryByText('Brouillon enregistré.')).not.toBeInTheDocument();
    expect(screen.queryByText('Document A sauvegardé')).not.toBeInTheDocument();
  });

  test('n’autorise pas la soumission lorsque la version du document est absente', async () => {
    getDocumentInterneAutonome.mockResolvedValue(documentExemple({ version_contenu: null }));
    afficherDetail();
    await screen.findByText('Historique disponible');

    expect(screen.queryByRole('button', { name: 'Soumettre au Directeur' })).not.toBeInTheDocument();
    expect(soumettreDocumentInterneAutonome).not.toHaveBeenCalled();
  });

  test('resoumet un brouillon après sauvegarde des corrections avec sa nouvelle version', async () => {
    const user = userEvent.setup();
    getDocumentInterneAutonome.mockResolvedValue(documentExemple({
      statut: 'a_corriger',
      motif_correction: 'Précisez la date.',
    }));
    sauvegarderDocumentInterneAutonome.mockResolvedValue(documentExemple({
      version_contenu: 5,
      statut: 'brouillon',
    }));
    soumettreDocumentInterneAutonome.mockResolvedValue(documentExemple({
      version_contenu: 5,
      statut: 'soumis_directeur',
      statut_label: 'Soumis au Directeur',
    }));

    afficherDetail();
    await user.type(await screen.findByLabelText('Contenu'), ' Correction');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await screen.findByRole('button', { name: 'Soumettre au Directeur' });
    await user.click(screen.getByRole('button', { name: 'Soumettre au Directeur' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));

    await waitFor(() => expect(soumettreDocumentInterneAutonome).toHaveBeenCalledWith(15, 5));
    expect(await screen.findByText('Soumis au Directeur')).toBeInTheDocument();
  });

  test('ignore une erreur réseau tardive de A après une soumission réussie de B', async () => {
    const user = userEvent.setup();
    const soumissionA = promesseControlee();
    const soumissionB = promesseControlee();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple({ id: 15, courrier: { objet: 'Document A', contenu: texte('Contenu A') } }))
      .mockResolvedValueOnce(documentExemple({ id: 16, courrier: { objet: 'Document B', contenu: texte('Contenu B') } }));
    soumettreDocumentInterneAutonome
      .mockImplementationOnce(() => soumissionA.promise)
      .mockImplementationOnce(() => soumissionB.promise);
    const { router } = afficherDetail();
    await user.click(await screen.findByRole('button', { name: 'Soumettre au Directeur' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));
    await router.navigate('/direction/documents-internes/16');
    expect(await screen.findByText('Document B')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Soumettre au Directeur' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));
    expect(soumettreDocumentInterneAutonome).toHaveBeenNthCalledWith(2, 16, 4);
    await act(async () => {
      soumissionB.resolve(documentExemple({
        id: 16,
        statut: 'soumis_directeur',
        statut_label: 'Soumis au Directeur',
        courrier: { objet: 'Document B', contenu: texte('Contenu B') },
      }));
      await soumissionB.promise;
    });
    await act(async () => {
      soumissionA.reject({ request: {}, message: 'late network failure' });
      await soumissionA.promise.catch(() => {});
    });
    expect(screen.getByRole('heading', { name: 'Document B' })).toBeInTheDocument();
    expect(screen.getByText('Soumis au Directeur')).toBeInTheDocument();
    expect(screen.queryByText('Impossible de soumettre le document. Réessayez.')).not.toBeInTheDocument();
    expect(useToastStore.getState().toasts.some((toast) => toast.message?.includes('Document A'))).toBe(false);
  });

  test('invalide une confirmation ouverte lorsque l’identifiant change', async () => {
    const user = userEvent.setup();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple({ id: 15 }))
      .mockResolvedValueOnce(documentExemple({ id: 16, courrier: { objet: 'Document B', contenu: texte('Contenu B') } }));
    const { router } = afficherDetail();
    await user.click(await screen.findByRole('button', { name: 'Soumettre au Directeur' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await router.navigate('/direction/documents-internes/16');
    expect(await screen.findByText('Document B')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(soumettreDocumentInterneAutonome).not.toHaveBeenCalled();
  });

  test('envoie réellement la soumission de B pendant que celle de A reste en attente, sans ancien déverrouillage', async () => {
    const user = userEvent.setup();
    const soumissionA = promesseControlee();
    const soumissionB = promesseControlee();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple({ id: 15 }))
      .mockResolvedValueOnce(documentExemple({ id: 16, courrier: { objet: 'Document B', contenu: texte('Contenu B') } }));
    soumettreDocumentInterneAutonome
      .mockImplementationOnce(() => soumissionA.promise)
      .mockImplementationOnce(() => soumissionB.promise);
    const { router } = afficherDetail();
    await user.click(await screen.findByRole('button', { name: 'Soumettre au Directeur' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));
    await router.navigate('/direction/documents-internes/16');
    await screen.findByText('Document B');
    await user.click(screen.getByRole('button', { name: 'Soumettre au Directeur' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));

    expect(soumettreDocumentInterneAutonome).toHaveBeenNthCalledWith(1, 15, 4);
    expect(soumettreDocumentInterneAutonome).toHaveBeenNthCalledWith(2, 16, 4);
    await act(async () => {
      soumissionA.resolve(documentExemple({ id: 15, statut: 'soumis_directeur' }));
      await soumissionA.promise;
    });
    const dialogueB = screen.getByRole('dialog');
    expect(within(dialogueB).getByRole('button', { name: 'Patientez…' })).toBeDisabled();
    await act(async () => {
      soumissionB.resolve(documentExemple({
        id: 16,
        statut: 'soumis_directeur',
        statut_label: 'Soumis au Directeur',
        courrier: { objet: 'Document B', contenu: texte('Contenu B') },
      }));
      await soumissionB.promise;
    });
    expect(screen.getByRole('heading', { name: 'Document B' })).toBeInTheDocument();
    expect(screen.getByText('Soumis au Directeur')).toBeInTheDocument();
  });

  test.each([
    [401, 'Votre session a expiré. Connectez-vous à nouveau.'],
    [403, "Vous n’êtes pas autorisé à effectuer cette action."],
    [404, 'Ce document est introuvable ou n’est pas accessible.'],
    [409, /version ou le statut du document a changé/i],
    [422, 'Certaines informations sont invalides. Vérifiez les champs signalés.'],
  ])('préserve le contenu et présente un message sûr pour une erreur de soumission HTTP %i', async (status, message) => {
    const user = userEvent.setup();
    getDocumentInterneAutonome.mockResolvedValue(documentExemple());
    soumettreDocumentInterneAutonome.mockRejectedValue({
      response: { status, data: { message: 'détail technique secret' } },
    });
    afficherDetail();
    await user.click(await screen.findByRole('button', { name: 'Soumettre au Directeur' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText('Contenu')).toHaveValue('Contenu initial');
    expect(screen.queryByText('détail technique secret')).not.toBeInTheDocument();
    if (status === 409) {
      expect(screen.getByRole('button', { name: 'Consulter la version serveur' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Soumettre au Directeur' })).toBeDisabled();
    }
  });

  test('après un conflit, remplace uniquement sur confirmation puis exige une nouvelle confirmation de soumission', async () => {
    const user = userEvent.setup();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple())
      .mockResolvedValueOnce(documentExemple({
        version_contenu: 5,
        courrier: { objet: 'Version serveur', contenu: texte('Contenu serveur') },
      }));
    soumettreDocumentInterneAutonome
      .mockRejectedValueOnce({ response: { status: 409 } })
      .mockResolvedValueOnce(documentExemple({
        version_contenu: 5,
        statut: 'soumis_directeur',
        statut_label: 'Soumis au Directeur',
      }));

    afficherDetail();
    await user.click(await screen.findByRole('button', { name: 'Soumettre au Directeur' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));
    expect(await screen.findByText(/La version ou le statut du document a changé/)).toBeInTheDocument();
    expect(screen.getByLabelText('Contenu')).toHaveValue('Contenu initial');

    await user.click(screen.getByRole('button', { name: 'Consulter la version serveur' }));
    expect(await screen.findByLabelText('Aperçu de la version serveur')).toHaveValue('Contenu serveur');
    expect(screen.getByLabelText('Contenu')).toHaveValue('Contenu initial');
    await user.click(screen.getByRole('button', { name: 'Remplacer le contenu local par cette version' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remplacer le contenu local' }));
    await waitFor(() => expect(screen.getByLabelText('Contenu')).toHaveValue('Contenu serveur'));

    await user.click(screen.getByRole('button', { name: 'Soumettre au Directeur' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Soumettre ce document au Directeur pour examen');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Soumettre au Directeur' }));
    await waitFor(() => expect(soumettreDocumentInterneAutonome).toHaveBeenLastCalledWith(15, 5));
    expect(await screen.findByText('Soumis au Directeur')).toBeInTheDocument();
  });

  test('préserve les modifications locales sur 409 et exige confirmation avant remplacement', async () => {
    const user = userEvent.setup();
    const conflit = { response: { status: 409 } };
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple())
      .mockResolvedValueOnce(documentExemple({
        version_contenu: 5,
        courrier: { objet: 'Version serveur', contenu: texte('Contenu serveur') },
      }));
    sauvegarderDocumentInterneAutonome.mockRejectedValue(conflit);

    afficherDetail();
    await screen.findByText('Historique disponible');
    expect(screen.getByText('4')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Contenu'));
    await user.type(screen.getByLabelText('Contenu'), 'Modification locale');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));

    expect(await screen.findByText(/vos modifications locales sont conservées/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Contenu')).toHaveValue('Modification locale');
    expect(screen.getByText('4')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Consulter la version serveur' }));
    expect(await screen.findByLabelText('Aperçu de la version serveur')).toHaveValue('Contenu serveur');
    expect(screen.getByLabelText('Contenu')).toHaveValue('Modification locale');
    expect(screen.getByText('4')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remplacer le contenu local par cette version' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Contenu')).toHaveValue('Modification locale');
    await user.click(screen.getByRole('button', { name: 'Remplacer le contenu local' }));
    await waitFor(() => expect(screen.getByLabelText('Contenu')).toHaveValue('Contenu serveur'));
    expect(screen.getByLabelText(/Objet/)).toHaveValue('Version serveur');
    expect(sauvegarderDocumentInterneAutonome).toHaveBeenCalledTimes(1);

    sauvegarderDocumentInterneAutonome.mockResolvedValueOnce(documentExemple({ version_contenu: 6 }));
    await user.clear(screen.getByLabelText('Contenu'));
    await user.type(screen.getByLabelText('Contenu'), 'Modification après consultation');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await waitFor(() => expect(sauvegarderDocumentInterneAutonome).toHaveBeenLastCalledWith(15, {
      objet: 'Version serveur',
      contenu: texte('Modification après consultation'),
      version_contenu: 5,
    }));
  });

  test('conserve le brouillon local après une erreur réseau', async () => {
    const user = userEvent.setup();
    getDocumentInterneAutonome.mockResolvedValue(documentExemple());
    sauvegarderDocumentInterneAutonome.mockRejectedValue({
      response: { status: 500, data: { message: 'message serveur privé' } },
      request: {},
    });
    afficherDetail();
    await screen.findByText('Historique disponible');
    await user.clear(screen.getByLabelText('Contenu'));
    await user.type(screen.getByLabelText('Contenu'), 'Brouillon local réseau');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));

    expect(await screen.findByText('Impossible d’enregistrer le document. Réessayez.')).toBeInTheDocument();
    expect(screen.getByLabelText('Contenu')).toHaveValue('Brouillon local réseau');
    expect(screen.queryByText('message serveur privé')).not.toBeInTheDocument();
  });

  test('affiche les erreurs 422 connues et ne révèle pas les messages serveur inattendus', async () => {
    const user = userEvent.setup();
    creerDocumentInterneAutonome.mockRejectedValue({
      response: {
        status: 422,
        data: {
          message: 'message serveur privé',
          errors: { objet: ['L’objet ne respecte pas la règle métier.'] },
        },
      },
    });
    const router = createMemoryRouter([
      { path: '/direction/documents-internes/nouveau', element: <DocumentInterneAutonomePage /> },
      { path: '/direction/documents-internes/:id', element: <div>Document créé</div> },
    ], { initialEntries: ['/direction/documents-internes/nouveau'] });
    render(<RouterProvider router={router} />);
    await user.type(screen.getByLabelText(/Objet/), 'Nouvelle note');
    await user.type(screen.getByLabelText('Contenu'), 'Contenu valide');
    await user.click(screen.getByRole('button', { name: 'Créer le brouillon' }));

    expect(await screen.findByText('L’objet ne respecte pas la règle métier.')).toBeInTheDocument();
    expect(screen.getByText('Certaines informations sont invalides. Vérifiez les champs signalés.')).toBeInTheDocument();
    expect(screen.queryByText('message serveur privé')).not.toBeInTheDocument();
  });

  test.each([
    [403, 'Vous n’êtes pas autorisé à effectuer cette action.'],
    [404, 'Ce document est introuvable ou n’est pas accessible.'],
  ])('ne présente aucune donnée lorsque le chargement répond HTTP %i', async (status, message) => {
    getDocumentInterneAutonome.mockRejectedValue({
      response: { status, data: { message: 'détail privé côté serveur' } },
    });
    afficherDetail();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText('Note initiale')).not.toBeInTheDocument();
    expect(screen.queryByText('détail privé côté serveur')).not.toBeInTheDocument();
  });

  test('permet de modifier un document retourné pour correction, et bloque l’édition des autres statuts', async () => {
    getDocumentInterneAutonome.mockResolvedValue(documentExemple({
      statut: 'a_corriger',
      motif_correction: 'Précisez la date de la note.',
      correction_demandee_at: '2026-05-05T10:00:00Z',
    }));
    afficherDetail();
    expect(await screen.findByText(/Précisez la date de la note/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Contenu'), ' Ajout');
    expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' })).toBeEnabled();

    cleanup();
    getDocumentInterneAutonome.mockResolvedValue(documentExemple({ statut: 'soumis_directeur' }));
    afficherDetail();
    expect(await screen.findByText('Ce document n’est pas modifiable dans son statut actuel.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le brouillon' })).not.toBeInTheDocument();
  });

  test('refuse de rendre un document historique comme autonome', async () => {
    getDocumentInterneAutonome.mockResolvedValue(documentExemple({ origine: 'traitement_direction' }));
    afficherDetail();
    expect(await screen.findByText('Cette ressource ne correspond pas à un document autonome.')).toBeInTheDocument();
  });

  test('conserve et bloque la modification d’un contenu JSON comportant des nœuds ou marques inconnus', async () => {
    const contenu = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texte conservé', marks: [{ type: 'link', attrs: { href: 'https://example.test' } }] }] }],
    };
    getDocumentInterneAutonome.mockResolvedValue(documentExemple({
      courrier: { objet: 'Note riche', contenu },
    }));
    afficherDetail();
    await screen.findByText(/L’édition est désactivée pour éviter toute perte/);
    expect(screen.getByLabelText(/Objet/)).toBeDisabled();
    expect(screen.getByText((_, element) =>
      element?.tagName === 'PRE' && element.textContent === JSON.stringify(contenu, null, 2)
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le brouillon' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Soumettre au Directeur' })).not.toBeInTheDocument();
  });

  test('reconnaît les nœuds et marques JSON pris en charge par TipTap', async () => {
    const contenu = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Titre', marks: [{ type: 'bold' }] }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Corps', marks: [{ type: 'italic' }] }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Élément' }] }] }] },
      ],
    };
    getDocumentInterneAutonome.mockResolvedValue(documentExemple({
      courrier: { objet: 'Note riche compatible', contenu },
    }));
    afficherDetail();
    expect(await screen.findByLabelText('Contenu')).toBeInTheDocument();
    expect(screen.queryByText(/L’édition est désactivée/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Objet/)).toBeEnabled();
  });

  test('permet la lecture seule d’un document valide et de sa référence institutionnelle', async () => {
    getDocumentInterneAutonome.mockResolvedValue(documentExemple({
      statut: 'valide',
      statut_label: 'Validé',
      courrier: {
        objet: 'Document validé',
        contenu: texte('Contenu final'),
        reference_documentaire: 'ONT-2026-00042',
      },
    }));
    afficherDetail();
    expect(await screen.findAllByText('ONT-2026-00042')).toHaveLength(2);
    expect(screen.getByText('Ce document n’est pas modifiable dans son statut actuel.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le brouillon' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /soumettre|valider|signer|transmettre/i })).not.toBeInTheDocument();
  });
});
