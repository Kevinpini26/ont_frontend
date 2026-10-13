import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  demanderCorrectionDocumentProduit,
  getDocumentInterneAutonome,
  validerDocumentProduit,
} from '../api/courrierApi';
import { DocumentInterneDirecteurPage } from './DocumentInterneDirecteurPage';

vi.mock('../api/courrierApi', () => ({
  demanderCorrectionDocumentProduit: vi.fn(),
  getDocumentInterneAutonome: vi.fn(),
  validerDocumentProduit: vi.fn(),
}));

vi.mock('../components/TipTapEditor', () => ({
  TipTapEditor: ({ content, editable }) => (
    <textarea aria-label="Contenu en lecture seule" readOnly={!editable} value={content.content[0].content[0].text} />
  ),
}));

const contenuCompatible = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texte approuvé' }] }],
};

const documentExemple = (id = 15, overrides = {}) => ({
  id,
  origine: 'autonome',
  statut: 'soumis_directeur',
  statut_label: 'Soumis au Directeur',
  directeur: { id: 3, name: 'Directeur assigné' },
  soumis_at: '2026-05-05T10:00:00Z',
  courrier: {
    objet: `Objet ${id}`,
    contenu: contenuCompatible,
    reference_documentaire: null,
  },
  tracabilite: {
    createur: { name: 'Secrétaire créatrice' },
    dernier_editeur: { name: 'Secrétaire éditrice' },
    soumis_par: { name: 'Secrétaire soumettrice' },
    correction_demandee_par: null,
    valide_par: null,
  },
  historique: [{ action: 'document_direction.soumis', acteur: { name: 'Secrétaire soumettrice' }, date: '2026-05-05T10:00:00Z' }],
  ...overrides,
});

function monter(path = '/direction/directeur/documents-internes/15') {
  const router = createMemoryRouter([
    { path: '/direction/directeur/documents-internes/:id', element: <DocumentInterneDirecteurPage /> },
    { path: '/direction/directeur/documents-internes', element: <div>Liste directeur</div> },
  ], { initialEntries: [path] });
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

describe('DocumentInterneDirecteurPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getDocumentInterneAutonome.mockResolvedValue(documentExemple());
  });
  afterEach(cleanup);

  test('consulte le document en lecture seule avec les données de traçabilité sérialisées', async () => {
    monter();
    expect(await screen.findByText('Objet 15')).toBeInTheDocument();
    expect(screen.getByText('Direction productrice : Indisponible')).toBeInTheDocument();
    expect(screen.getByText(/Directeur assigné/)).toBeInTheDocument();
    expect(screen.getAllByText(/Secrétaire créatrice/)).toHaveLength(2);
    expect(screen.getAllByText(/Secrétaire soumettrice/)).toHaveLength(2);
    expect(screen.getByText(/document_direction\.soumis/)).toBeInTheDocument();
    expect(screen.getByLabelText('Contenu en lecture seule')).toHaveValue('Texte approuvé');
    expect(screen.getByLabelText('Contenu en lecture seule')).toHaveAttribute('readonly');
    expect(getDocumentInterneAutonome).toHaveBeenCalledWith('15', expect.any(AbortSignal));
  });

  test('refuse une ressource historique même si son statut permettrait une décision', async () => {
    getDocumentInterneAutonome.mockResolvedValue(documentExemple(15, {
      origine: 'traitement_direction',
      statut: 'soumis_directeur',
      courrier: { objet: 'Contenu historique privé', contenu: contenuCompatible },
      tracabilite: { createur: { name: 'Acteur historique' } },
    }));
    monter();

    expect(await screen.findByText(/ne correspond pas au périmètre des documents internes autonomes/)).toBeInTheDocument();
    expect(screen.queryByText('Contenu historique privé')).not.toBeInTheDocument();
    expect(screen.queryByText('Acteur historique')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Contenu en lecture seule')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demander une correction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
  });

  test('montre le contenu TipTap incompatible comme données brutes sans actions d’édition', async () => {
    const contenu = { type: 'doc', content: [{ type: 'unsupportedWidget', attrs: { secret: '<script>test()</script>' } }] };
    getDocumentInterneAutonome.mockResolvedValue(documentExemple(15, { courrier: { ...documentExemple().courrier, contenu } }));
    monter();
    expect(await screen.findByText(/Format non pris en charge pour l’aperçu/)).toBeInTheDocument();
    expect(screen.getByText(/unsupportedWidget/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Contenu en lecture seule')).not.toBeInTheDocument();
    expect(screen.queryByText('test()', { exact: false })).toBeInTheDocument();
  });

  test('demande une correction uniquement après motif valide et confirmation explicite', async () => {
    const user = userEvent.setup();
    const corrige = documentExemple(15, {
      statut: 'a_corriger',
      statut_label: 'À corriger',
      motif_correction: 'Préciser la période',
      tracabilite: { ...documentExemple().tracabilite, correction_demandee_par: { name: 'Directeur assigné' } },
    });
    getDocumentInterneAutonome.mockResolvedValueOnce(documentExemple()).mockResolvedValueOnce(corrige);
    demanderCorrectionDocumentProduit.mockResolvedValue(corrige);
    monter();
    await user.click(await screen.findByRole('button', { name: 'Demander une correction' }));
    const dialogue = screen.getByRole('dialog');
    const champ = within(dialogue).getByLabelText(/Motif de correction/);
    const confirmer = within(dialogue).getByRole('button', { name: 'Confirmer la demande de correction' });
    expect(confirmer).toBeDisabled();
    await user.type(champ, '   ');
    expect(confirmer).toBeDisabled();
    await user.clear(champ);
    await user.type(champ, '  Préciser la période  ');
    await user.click(within(dialogue).getByRole('button', { name: 'Annuler' }));
    expect(demanderCorrectionDocumentProduit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Demander une correction' }));
    await user.type(screen.getByLabelText(/Motif de correction/), '  Préciser la période  ');
    await user.click(screen.getByRole('button', { name: 'Confirmer la demande de correction' }));
    await waitFor(() => expect(demanderCorrectionDocumentProduit).toHaveBeenCalledWith('15', 'Préciser la période'));
    expect(await screen.findByText('Correction demandée')).toBeInTheDocument();
    expect(screen.getByText('Motif de correction : Préciser la période')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
  });

  test('limite le motif à 5 000 caractères', async () => {
    const user = userEvent.setup();
    monter();
    await user.click(await screen.findByRole('button', { name: 'Demander une correction' }));
    const champ = screen.getByLabelText(/Motif de correction/);
    expect(champ).toHaveAttribute('maxlength', '5000');
    await user.type(champ, 'motif');
    expect(screen.getByText('5 / 5 000 caractères')).toBeInTheDocument();
  });

  test('demande confirmation avant validation et affiche la référence retournée', async () => {
    const user = userEvent.setup();
    const valide = documentExemple(15, {
      statut: 'valide',
      statut_label: 'Validé',
      valide_at: '2026-05-06T12:00:00Z',
      courrier: { ...documentExemple().courrier, reference_documentaire: 'DIR-2026-008' },
    });
    getDocumentInterneAutonome.mockResolvedValueOnce(documentExemple()).mockResolvedValueOnce(valide);
    validerDocumentProduit.mockResolvedValue(valide);
    monter();
    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    const dialogue = screen.getByRole('dialog');
    expect(dialogue).toHaveTextContent('ne constitue pas une signature physique ni un cachet officiel');
    await user.click(within(dialogue).getByRole('button', { name: 'Annuler' }));
    expect(validerDocumentProduit).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));
    await waitFor(() => expect(validerDocumentProduit).toHaveBeenCalledWith('15'));
    expect(await screen.findAllByText(/DIR-2026-008/)).toHaveLength(2);
    expect(screen.getByText('Contenu validé')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demander une correction' })).not.toBeInTheDocument();
  });

  test.each(['brouillon', 'a_corriger', 'valide', 'soumis_reception'])('ne propose aucune décision pour le statut %s', async (statut) => {
    getDocumentInterneAutonome.mockResolvedValue(documentExemple(15, { statut }));
    monter();
    await screen.findByText(`Objet 15`);
    expect(screen.queryByRole('button', { name: 'Demander une correction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
  });

  test('empêche les doubles décisions pendant une requête en cours', async () => {
    const user = userEvent.setup();
    const requete = promesseControlee();
    validerDocumentProduit.mockReturnValue(requete.promise);
    monter();
    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    const confirmer = within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' });
    await user.dblClick(confirmer);
    expect(validerDocumentProduit).toHaveBeenCalledTimes(1);
    expect(confirmer).toBeDisabled();
    await act(async () => {
      requete.resolve(documentExemple(15, { statut: 'valide' }));
      await requete.promise;
    });
  });

  test('ignore le succès tardif du document A après navigation vers B', async () => {
    const user = userEvent.setup();
    const validationA = promesseControlee();
    const chargementB = promesseControlee();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple(15))
      .mockImplementationOnce(() => chargementB.promise);
    validerDocumentProduit.mockReturnValue(validationA.promise);
    const { router } = monter();
    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));
    await router.navigate('/direction/directeur/documents-internes/16');
    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2));
    chargementB.resolve(documentExemple(16));
    expect(await screen.findByText('Objet 16')).toBeInTheDocument();
    await act(async () => {
      validationA.resolve(documentExemple(15, { statut: 'valide', courrier: { ...documentExemple().courrier, reference_documentaire: 'REF-A' } }));
      await validationA.promise;
    });
    expect(screen.getByText('Objet 16')).toBeInTheDocument();
    expect(screen.queryByText('REF-A')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Valider le contenu' }).length).toBeGreaterThan(0);
  });

  test('ignore une erreur tardive de A après navigation et permet l’actualisation volontaire sur B', async () => {
    const user = userEvent.setup();
    const validationA = promesseControlee();
    const chargementB = promesseControlee();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple(15))
      .mockImplementationOnce(() => chargementB.promise)
      .mockResolvedValueOnce(documentExemple(16, { statut: 'a_corriger' }));
    validerDocumentProduit.mockReturnValue(validationA.promise);
    demanderCorrectionDocumentProduit.mockResolvedValue(documentExemple(16, { statut: 'a_corriger' }));
    const { router } = monter();
    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));
    await router.navigate('/direction/directeur/documents-internes/16');
    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2));
    chargementB.resolve(documentExemple(16));
    expect(await screen.findByText('Objet 16')).toBeInTheDocument();
    await act(async () => {
      validationA.reject({ response: { status: 409 } });
      await validationA.promise.catch(() => {});
    });
    expect(screen.getByText('Objet 16')).toBeInTheDocument();
    expect(screen.queryByText(/Le document a changé d’état/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Demander une correction' }));
    await user.type(screen.getByLabelText(/Motif de correction/), 'Motif de B');
    await user.click(screen.getByRole('button', { name: 'Confirmer la demande de correction' }));
    await waitFor(() => expect(demanderCorrectionDocumentProduit).toHaveBeenCalledWith('16', 'Motif de B'));
    expect(await screen.findByText('Correction demandée')).toBeInTheDocument();
  });

  test('un 409 sur le document courant requiert une actualisation manuelle', async () => {
    const user = userEvent.setup();
    validerDocumentProduit.mockRejectedValue({ response: { status: 409 } });
    getDocumentInterneAutonome.mockResolvedValueOnce(documentExemple()).mockResolvedValueOnce(documentExemple(15, { statut: 'valide' }));
    monter();
    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));
    expect(await screen.findByText(/La décision a peut-être été enregistrée/)).toBeInTheDocument();
    expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Actualiser le document' }));
    expect(await screen.findByText('Contenu validé')).toBeInTheDocument();
    expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2);
  });

  test('neutralise les décisions si le POST est accepté avec une réponse partielle et le rechargement échoue', async () => {
    const user = userEvent.setup();
    validerDocumentProduit.mockResolvedValue({ id: 15, origine: 'autonome', statut: 'soumis_directeur' });
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple())
      .mockRejectedValueOnce({ response: { status: 503 } });
    monter();

    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));

    expect(await screen.findByText(/La décision a peut-être été enregistrée/)).toBeInTheDocument();
    expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(1);
    expect(validerDocumentProduit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Actualiser le document' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Actualiser le document' }));
    expect(await screen.findByText(/son résultat n’a pas pu être confirmé/)).toBeInTheDocument();
    expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2);
    expect(validerDocumentProduit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Actualiser le document' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Référence documentaire : [^—]/)).not.toBeInTheDocument();
    expect(screen.queryByText('DIR-2026-008')).not.toBeInTheDocument();
  });

  test.each([
    ['validation', 500],
    ['correction', 503],
  ])('bloque les décisions après un POST de %s en erreur HTTP %s jusqu’à actualisation', async (type, status) => {
    const user = userEvent.setup();
    if (type === 'validation') {
      validerDocumentProduit.mockRejectedValue({ response: { status } });
    } else {
      demanderCorrectionDocumentProduit.mockRejectedValue({ response: { status } });
    }
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple())
      .mockRejectedValueOnce({ response: { status: 503 } });
    monter();

    if (type === 'validation') {
      await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));
    } else {
      await user.click(await screen.findByRole('button', { name: 'Demander une correction' }));
      await user.type(screen.getByLabelText(/Motif de correction/), 'Motif requis');
      await user.click(screen.getByRole('button', { name: 'Confirmer la demande de correction' }));
    }

    expect(await screen.findByText(/La décision a peut-être été enregistrée/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualiser le document' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demander une correction' })).not.toBeInTheDocument();

    if (type === 'validation') {
      expect(validerDocumentProduit).toHaveBeenCalledTimes(1);
    } else {
      expect(demanderCorrectionDocumentProduit).toHaveBeenCalledTimes(1);
    }
    expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Actualiser le document' }));
    expect(await screen.findByText(/son résultat n’a pas pu être confirmé/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demander une correction' })).not.toBeInTheDocument();
    expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2);
    expect(validerDocumentProduit).toHaveBeenCalledTimes(type === 'validation' ? 1 : 0);
    expect(demanderCorrectionDocumentProduit).toHaveBeenCalledTimes(type === 'correction' ? 1 : 0);
  });

  test('après actualisation réussie avec un statut validé, les décisions restent bloquées', async () => {
    const user = userEvent.setup();
    validerDocumentProduit.mockRejectedValueOnce({ response: { status: 500 } });
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple())
      .mockResolvedValueOnce(documentExemple(15, { statut: 'valide' }));
    monter();

    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));
    expect(await screen.findByRole('button', { name: 'Actualiser le document' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Actualiser le document' }));
    expect(await screen.findByText('Contenu validé')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demander une correction' })).not.toBeInTheDocument();
    expect(validerDocumentProduit).toHaveBeenCalledTimes(1);
    expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2);
  });

  test('après actualisation réussie, un document autonome correspondant encore soumis réactive les décisions', async () => {
    const user = userEvent.setup();
    validerDocumentProduit.mockRejectedValueOnce({ response: { status: 500 } });
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple())
      .mockResolvedValueOnce(documentExemple(15, { statut: 'soumis_directeur' }));
    monter();

    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));
    expect(await screen.findByRole('button', { name: 'Actualiser le document' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Actualiser le document' }));
    expect(await screen.findByRole('button', { name: 'Valider le contenu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demander une correction' })).toBeInTheDocument();
    expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2);
    expect(validerDocumentProduit).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['identité', { id: 16, origine: 'autonome', statut: 'soumis_directeur' }],
    ['origine', { id: 15, origine: 'traitement_direction', statut: 'soumis_directeur' }],
  ])('ne réactive pas les décisions après actualisation si l’%s est incohérente', async (incoherence, documentActualise) => {
    const user = userEvent.setup();
    validerDocumentProduit.mockRejectedValueOnce({ response: { status: 500 } });
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple())
      .mockResolvedValueOnce(documentExemple(15, documentActualise));
    monter();

    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));
    await user.click(await screen.findByRole('button', { name: 'Actualiser le document' }));

    if (incoherence === 'origine') {
      expect(await screen.findByText(/ne correspond pas au périmètre des documents internes autonomes/)).toBeInTheDocument();
    } else {
      expect(await screen.findByText(/son résultat n’a pas pu être confirmé/)).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demander une correction' })).not.toBeInTheDocument();
    expect(validerDocumentProduit).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['identity', { id: 16, origine: 'autonome', statut: 'valide' }],
    ['origine', { id: 15, origine: 'traitement_direction', statut: 'valide' }],
  ])('refuse une réponse de décision dont l’%s est incohérente', async (_type, resultat) => {
    const user = userEvent.setup();
    validerDocumentProduit.mockResolvedValue({
      ...resultat,
      courrier: { objet: 'Réponse étrangère', reference_documentaire: 'REFERENCE-INVENTEE' },
    });
    monter();

    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));

    expect(await screen.findByText(/réponse reçue est incomplète/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualiser le document' })).toBeInTheDocument();
    expect(screen.queryByText('Réponse étrangère')).not.toBeInTheDocument();
    expect(screen.queryByText('REFERENCE-INVENTEE')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
    expect(validerDocumentProduit).toHaveBeenCalledTimes(1);
  });

  test('une erreur réseau après une décision potentiellement acceptée bloque toute répétition', async () => {
    const user = userEvent.setup();
    validerDocumentProduit.mockRejectedValue(new Error('network failure'));
    monter();

    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));

    expect(await screen.findByText(/La décision a peut-être été enregistrée/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualiser le document' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
    expect(validerDocumentProduit).toHaveBeenCalledTimes(1);
  });

  test('masque immédiatement le document A et ses actions lorsque la route passe à B', async () => {
    const chargementB = promesseControlee();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple(15))
      .mockImplementationOnce(() => chargementB.promise);
    const { router } = monter();
    expect(await screen.findByText('Objet 15')).toBeInTheDocument();

    await router.navigate('/direction/directeur/documents-internes/16');

    await waitFor(() => expect(screen.queryByText('Objet 15')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Valider le contenu' })).not.toBeInTheDocument();
    await act(async () => {
      chargementB.resolve(documentExemple(16));
      await chargementB.promise;
    });
    expect(await screen.findByText('Objet 16')).toBeInTheDocument();
  });

  test.each([401, 403, 404, 422])('présente une erreur HTTP %s sans détails techniques', async (status) => {
    const user = userEvent.setup();
    validerDocumentProduit.mockRejectedValue({ response: { status, data: { message: 'internal exception' } } });
    monter();
    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('internal exception')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Valider le contenu' }).length).toBeGreaterThan(0);
  });

  test('ignore une réponse arrivée après démontage', async () => {
    const user = userEvent.setup();
    const validation = promesseControlee();
    validerDocumentProduit.mockReturnValue(validation.promise);
    const rendu = monter();
    await user.click(await screen.findByRole('button', { name: 'Valider le contenu' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Valider le contenu' }));
    rendu.unmount();
    await act(async () => {
      validation.resolve(documentExemple(15, { statut: 'valide' }));
      await validation.promise;
    });
    expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(1);
  });

  test('ignore les réponses de détails A et B arrivées après le chargement actuel de A', async () => {
    const ancienA = promesseControlee();
    const chargementB = promesseControlee();
    const chargementRecentA = promesseControlee();
    getDocumentInterneAutonome
      .mockImplementationOnce(() => ancienA.promise)
      .mockImplementationOnce(() => chargementB.promise)
      .mockImplementationOnce(() => chargementRecentA.promise);
    const { router } = monter();
    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(1));
    await router.navigate('/direction/directeur/documents-internes/16');
    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(2));
    await router.navigate('/direction/directeur/documents-internes/15');
    await waitFor(() => expect(getDocumentInterneAutonome).toHaveBeenCalledTimes(3));
    await act(async () => {
      chargementRecentA.resolve(documentExemple(15, { courrier: { ...documentExemple().courrier, objet: 'A récent' } }));
      await chargementRecentA.promise;
    });
    expect(await screen.findByText('A récent')).toBeInTheDocument();
    await act(async () => {
      ancienA.resolve(documentExemple(15, { courrier: { ...documentExemple().courrier, objet: 'A ancien' } }));
      chargementB.resolve(documentExemple(16, { courrier: { ...documentExemple().courrier, objet: 'B ancien' } }));
      await Promise.all([ancienA.promise, chargementB.promise]);
    });
    expect(screen.getByText('A récent')).toBeInTheDocument();
    expect(screen.queryByText('A ancien')).not.toBeInTheDocument();
    expect(screen.queryByText('B ancien')).not.toBeInTheDocument();
  });

  test('ferme la demande de correction ouverte au changement de document', async () => {
    const user = userEvent.setup();
    getDocumentInterneAutonome
      .mockResolvedValueOnce(documentExemple())
      .mockResolvedValueOnce(documentExemple(16));
    const { router } = monter();
    await user.click(await screen.findByRole('button', { name: 'Demander une correction' }));
    await user.type(screen.getByLabelText(/Motif de correction/), 'Motif document A');
    await router.navigate('/direction/directeur/documents-internes/16');
    expect(await screen.findByText('Objet 16')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(demanderCorrectionDocumentProduit).not.toHaveBeenCalled();
  });
});
