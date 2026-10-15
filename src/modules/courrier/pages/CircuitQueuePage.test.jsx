import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CircuitQueuePage } from './CircuitQueuePage';
import { initierCourrierDg } from '../api/courrierApi';
import { creerInstructionCourrierDg, ouvrirInstructionCourrierDg } from '../api/instructionCourrierDgApi';

const contexte = vi.hoisted(() => ({
  user: { id: 1, poste: 'secretariat_1' },
  instructions: [],
  fileCourriers: null,
}));

vi.mock('../api/courrierApi', () => ({
  accuserReception: vi.fn(),
  accuserReceptionBordereauLot: vi.fn(),
  bordereauLotPdfUrl: vi.fn(),
  creerBordereauLot: vi.fn(),
  createCourrier: vi.fn(),
  initierCourrierDg: vi.fn(),
  listCourriers: vi.fn(),
}));
vi.mock('../api/instructionCourrierDgApi', () => ({
  annulerInstructionCourrierDg: vi.fn(),
  creerInstructionCourrierDg: vi.fn(),
  listInstructionsCourrierDg: vi.fn(),
  ouvrirInstructionCourrierDg: vi.fn(),
}));
vi.mock('../../../shared/hooks/useRequete', () => ({
  useRequete: (fetcher) => fetcher.toString().includes('listCourriers')
    ? contexte.fileCourriers
    : { donnees: { data: contexte.instructions }, chargement: false, erreur: null, recharger: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../kernel/store/authStore', () => ({
  useAuthStore: (selecteur) => selecteur({ user: contexte.user }),
}));
vi.mock('../../kernel/hooks/useDgAutorite', () => ({
  useDgAutorite: () => (contexte.user.poste === 'dg' ? 'titulaire' : null),
}));
vi.mock('../../kernel/api/agentsApi', () => ({ listAgentsCircuitCourrier: vi.fn().mockResolvedValue([{ id: 3, poste: 'assistant_1', name: 'Relecteur', poste_label: 'Assistant 1' }]) }));
vi.mock('../../kernel/api/directionsApi', () => ({ listDirections: vi.fn().mockResolvedValue([{ id: 5, nom: 'Direction test' }]) }));
vi.mock('../components/TipTapEditor', () => ({ TipTapEditor: () => <div>Éditeur</div> }));

beforeEach(() => {
  contexte.user = { id: 1, poste: 'secretariat_1' };
  contexte.instructions = [];
  contexte.fileCourriers = {
    donnees: { data: [] },
    chargement: false,
    erreur: null,
    recharger: vi.fn().mockResolvedValue(undefined),
  };
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('état de chargement de la file « À traiter »', () => {
  function afficherReception() {
    render(
      <MemoryRouter initialEntries={['/circuit/reception']}>
        <Routes>
          <Route path="/circuit/:poste" element={<CircuitQueuePage />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  test.each([
    [403, 'Access denied'],
    [500, 'SQLSTATE[42703]: Undefined column; database=systeme_ont; host=db.internal; at /srv/app/Query.php:42; stack trace'],
  ])('affiche une erreur HTTP %i sans la présenter comme une file vide ni révéler le détail serveur', async (status, message) => {
    contexte.fileCourriers = {
      donnees: null,
      chargement: false,
      erreur: { response: { status, data: { message } }, message: `Request failed with status code ${status}` },
      recharger: vi.fn().mockResolvedValue(undefined),
    };
    afficherReception();

    expect(await screen.findByText(`Impossible de charger les courriers. Veuillez réessayer. (HTTP ${status}).`, { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/SQLSTATE|systeme_ont|db\.internal|\/srv\/app|stack trace|Access denied|Request failed/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Rien à traiter pour le moment')).not.toBeInTheDocument();
    expect(screen.queryByText('À traiter (0)')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument();
  });

  test('le bouton Réessayer relance la requête via useRequete', () => {
    const recharger = vi.fn().mockResolvedValue(undefined);
    contexte.fileCourriers = {
      donnees: null,
      chargement: false,
      erreur: { response: { status: 403, data: { message: 'Accès refusé' } }, message: 'Forbidden' },
      recharger,
    };
    afficherReception();

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(recharger).toHaveBeenCalledTimes(1);
  });

  test('affiche l’état vide uniquement après une réponse réussie sans courrier', () => {
    contexte.fileCourriers = {
      donnees: { data: [] },
      chargement: false,
      erreur: null,
      recharger: vi.fn().mockResolvedValue(undefined),
    };
    afficherReception();

    expect(screen.getByText('À traiter (0)')).toBeInTheDocument();
    expect(screen.getByText('Rien à traiter pour le moment')).toBeInTheDocument();
  });

  test('affiche le chargement sans annoncer une file vide', () => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
    contexte.fileCourriers = {
      donnees: null,
      chargement: true,
      erreur: null,
      recharger: vi.fn().mockResolvedValue(undefined),
    };
    afficherReception();

    expect(screen.queryByText('Rien à traiter pour le moment')).not.toBeInTheDocument();
    expect(screen.queryByText('À traiter (0)')).not.toBeInTheDocument();
  });
});

describe('route de circuit par poste', () => {
  test('SEC1 est redirigé vers sa propre route si le paramètre URL désigne SEC2', async () => {
    render(
      <MemoryRouter initialEntries={['/circuit/secretariat_2']}>
        <Routes>
          <Route path="/circuit/secretariat_2" element={<CircuitQueuePage />} />
          <Route path="/circuit/secretariat_1" element={<div>Route SEC1</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Route SEC1')).toBeInTheDocument();
    expect(screen.queryByText('Nouveau courrier de la DG')).not.toBeInTheDocument();
  });
});

describe('instruction DG dans la file de circuit', () => {
  function afficher(poste) {
    render(<MemoryRouter initialEntries={[`/circuit/${poste}`]}><Routes><Route path="/circuit/:poste" element={<CircuitQueuePage />} /></Routes></MemoryRouter>);
  }

  test('SEC1 ne peut ouvrir le formulaire qu’après ouverture d’une instruction', async () => {
    const instruction = { id: 7, instruction: 'Préparer une note proactive.', active: true };
    contexte.instructions = [instruction];
    ouvrirInstructionCourrierDg.mockResolvedValue(instruction);
    initierCourrierDg.mockResolvedValue({ id: 10 });
    afficher('secretariat_1');

    expect(screen.queryByRole('button', { name: 'Initier le courrier' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Préparer le courrier' }));
    await screen.findByText('Éditeur');
    await waitFor(() => expect(screen.getByRole('option', { name: 'Direction test' })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Direction destinataire/), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/Objet/), { target: { value: 'Note proactive' } });
    fireEvent.change(screen.getByLabelText(/Relecteur désigné/), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Initier le courrier' }));
    await waitFor(() => expect(initierCourrierDg).toHaveBeenCalledWith(expect.objectContaining({ instruction_courrier_dg_id: 7 })));
  });

  test('DG formule une instruction sans rédiger le futur courrier', async () => {
    contexte.user = { id: 2, poste: 'dg' };
    creerInstructionCourrierDg.mockResolvedValue({ id: 8 });
    afficher('dg');

    fireEvent.change(screen.getByLabelText(/Instruction/), { target: { value: 'Préparer un courrier institutionnel.' } });
    fireEvent.click(screen.getByRole('button', { name: "Envoyer l'instruction à SEC1" }));
    await waitFor(() => expect(creerInstructionCourrierDg).toHaveBeenCalledWith(expect.objectContaining({ instruction: 'Préparer un courrier institutionnel.' })));
    expect(screen.queryByLabelText('Objet')).not.toBeInTheDocument();
  });

  test('la route dédiée SEC1 expose les instructions sans formulaire de création libre', () => {
    render(<MemoryRouter initialEntries={['/circuit/instructions-dg']}><Routes><Route path="/circuit/instructions-dg" element={<CircuitQueuePage instructionsSeulement />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Instructions DG' })).toBeInTheDocument();
    expect(screen.getByText('Aucune instruction DG active.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Initier le courrier' })).not.toBeInTheDocument();
  });
});
