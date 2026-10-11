import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { creerDocumentInterneAutonome, getDocumentInterneAutonome, sauvegarderDocumentInterneAutonome } from '../api/courrierApi';
import { DocumentInterneAutonomePage } from './DocumentInterneAutonomePage';

vi.mock('../api/courrierApi', () => ({
  creerDocumentInterneAutonome: vi.fn(),
  getDocumentInterneAutonome: vi.fn(),
  sauvegarderDocumentInterneAutonome: vi.fn(),
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
  return render(<RouterProvider router={router} />);
}

describe('DocumentInterneAutonomePage', () => {
  beforeEach(() => vi.clearAllMocks());

  test('crée un brouillon avec objet et contenu sans choisir la direction', async () => {
    const user = userEvent.setup();
    creerDocumentInterneAutonome.mockResolvedValue(documentExemple({ id: 19 }));

    const router = createMemoryRouter([
      { path: '/direction/documents-internes/nouveau', element: <DocumentInterneAutonomePage /> },
      { path: '/direction/documents-internes/:id', element: <div>Document créé</div> },
      { path: '/direction/documents-internes', element: <div>Liste des documents internes</div> },
    ], { initialEntries: ['/direction/documents-internes/nouveau'] });
    render(<RouterProvider router={router} />);
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
    expect(await screen.findByText('ONT-2026-00042')).toBeInTheDocument();
    expect(screen.getByText('Ce document n’est pas modifiable dans son statut actuel.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enregistrer le brouillon' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /soumettre|valider|signer|transmettre/i })).not.toBeInTheDocument();
  });
});
