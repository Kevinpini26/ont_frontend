import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CourrierDetailPage } from './CourrierDetailPage';

const mocks = vi.hoisted(() => ({ courrier: null, user: null, dgAutorite: true }));

vi.mock('../../../shared/hooks/useRequete', () => ({
  useRequete: () => ({ donnees: mocks.courrier, setDonnees: vi.fn(), chargement: false }),
}));
vi.mock('../../kernel/store/authStore', () => ({
  useAuthStore: (selector) => selector({ user: mocks.user }),
}));
vi.mock('../../kernel/hooks/useDgAutorite', () => ({ useDgAutorite: () => mocks.dgAutorite }));
vi.mock('../components/StatutTimeline', () => ({ StatutTimeline: () => null }));
vi.mock('../components/BordereauxTimeline', () => ({ BordereauxTimeline: () => null }));
vi.mock('../components/AnnotationsPanel', () => ({ AnnotationsPanel: () => null }));
vi.mock('../components/NumerisationPanel', () => ({ NumerisationPanel: () => null }));
vi.mock('../components/DossierDocumentsPanel', () => ({
  DossierDocumentsPanel: ({ autoriserActions }) => <div data-testid="dossier-actions" data-autoriser-actions={String(autoriserActions)} />,
}));
vi.mock('../components/MissionsDocumentairesPanel', () => ({
  MissionsDocumentairesPanel: ({ autoriserActions }) => <div data-testid="mission-actions" data-autoriser-actions={String(autoriserActions)} />,
}));
vi.mock('../components/DispatchDecisionPanel', () => ({
  DispatchDecisionPanel: ({ autoriserActions }) => <div data-testid="dispatch-actions" data-autoriser-actions={String(autoriserActions)} />,
}));
vi.mock('../../../shared/components/DocumentPreviewModal', () => ({
  DocumentPreviewModal: ({ open, title, url, downloadFilename }) => (
    open ? (
      <div data-testid="preview-modal" data-title={title} data-url={url} data-download={downloadFilename}>
        Preview
      </div>
    ) : null
  ),
}));
vi.mock('../components/TipTapEditor', () => ({
  TipTapEditor: ({ content }) => <div>{content?.content?.[0]?.content?.[0]?.text}</div>,
}));

afterEach(() => {
  cleanup();
  mocks.courrier = null;
  mocks.user = null;
  mocks.dgAutorite = true;
});

function afficherDetail(courrier, user = { id: 1, name: 'DG', poste: 'dg' }) {
  mocks.courrier = courrier;
  mocks.user = user;
  mocks.dgAutorite = user.poste === 'dg';
  return render(
    <MemoryRouter initialEntries={[`/courriers/${courrier.id}`]}>
      <Routes>
        <Route path="/courriers/:id" element={<CourrierDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const projetPreSignature = {
  id: 99,
  objet: 'Réponse à : Courrier entrant 12',
  en_reponse_a_courrier_id: 12,
  type: 'correspondance_generale',
  statut: 'projet_a_valider',
  sens: 'sortant',
  dossier_id: null,
  numero_depart: null,
  signe_at: null,
  pdf_disponible: false,
  pdf_chemin: null,
  relecture_validee_at: '2026-09-28T22:51:39Z',
  relecteur: { id: 2, name: 'DG2' },
  missions_documentaires: [],
  projet_reponse_contenu: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texte final de la réponse' }] }],
  },
  destinataire_externe_nom: 'Partenaire',
  destinataire_externe_email: 'partenaire@example.test',
  transitions: [],
  updated_at: '2026-09-28T22:51:39Z',
};

describe('détail de la réponse D', () => {
  test('affiche l’attente de validation tant que la relecture n’est pas validée', () => {
    afficherDetail({ ...projetPreSignature, relecture_validee_at: null });

    expect(screen.getByText('Projet en attente de validation')).toBeInTheDocument();
    expect(screen.queryByText('Projet prêt à signer')).not.toBeInTheDocument();
  });

  test('affiche le statut, le contenu final, le destinataire et le CTA DG avant signature', () => {
    afficherDetail(projetPreSignature);

    expect(screen.getAllByText('Projet prêt à signer').length).toBeGreaterThan(0);
    expect(screen.getByText('Texte final de la réponse')).toBeInTheDocument();
    expect(screen.getByText('Partenaire')).toBeInTheDocument();
    expect(screen.getByText('partenaire@example.test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Valider pour signature' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Signer la réponse' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Accusé null/i)).not.toBeInTheDocument();
  });

  test('affiche le statut et le numéro de départ sans bouton signer après envoi', () => {
    afficherDetail({
      ...projetPreSignature,
      statut: 'envoye',
      numero_depart: '2026-D0099',
      signe_at: '2026-09-28T22:51:39Z',
      pdf_disponible: true,
      pdf_chemin: 'courriers-signes/courrier-99.pdf',
    });

    expect(screen.getAllByText('2026-D0099').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Signer la réponse' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Accusé null/i)).not.toBeInTheDocument();
    expect(screen.getByText('Envoyé')).toBeInTheDocument();
  });

  test('affiche l’attente de signature et le PDF à imprimer sans le présenter comme signé', () => {
    afficherDetail({
      ...projetPreSignature,
      statut: 'en_attente_signature',
      numero_depart: '2026-D0100',
      valide_signature_at: '2026-09-29T10:00:00Z',
      valide_signature_par: { id: 1, name: 'DG' },
      pdf_a_signer_disponible: true,
      pdf_disponible: false,
      peut_televerser_scan_signe: true,
    });

    expect(screen.getByRole('heading', { name: 'En attente de signature physique' })).toBeInTheDocument();
    expect(screen.getAllByText(/2026-D0100/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Télécharger le PDF à signer' })).toBeInTheDocument();
    expect(screen.getByLabelText('Téléverser la version signée')).toHaveAttribute('accept', 'application/pdf,.pdf');
    expect(screen.getByRole('button', { name: 'Téléverser la version signée' })).toBeDisabled();
    expect(screen.getByText(/ne pourra plus être remplacé/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Signer la réponse' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Voir le PDF signé' })).not.toBeInTheDocument();
  });

  test('déclenche l’ouverture de la preview PDF au clic sur le bouton pré-signature', async () => {
    afficherDetail({
      ...projetPreSignature,
      statut: 'en_attente_signature',
      numero_depart: '2026-D0004',
      valide_signature_par: { id: 1, name: 'DG' },
      pdf_a_signer_disponible: true,
      pdf_disponible: false,
      peut_televerser_scan_signe: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Télécharger le PDF à signer' }));

    await waitFor(() => {
      expect(screen.getByTestId('preview-modal')).toHaveAttribute('data-title', 'Réponse à signer');
      expect(screen.getByTestId('preview-modal')).toHaveAttribute('data-url', '/courriers/99/pdf-a-signer');
      expect(screen.getByTestId('preview-modal')).toHaveAttribute('data-download', 'reponse-2026-D0004-a-signer.pdf');
    });
  });

  test('affiche Signé et le numéro de départ après signature', () => {
    afficherDetail({
      ...projetPreSignature,
      statut: 'signe',
      numero_depart: '2026-D0003',
      signe_at: '2026-09-29T00:26:57Z',
    });

    expect(screen.getByText('Signé')).toBeInTheDocument();
    expect(screen.getAllByText('2026-D0003').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Signer la réponse' })).not.toBeInTheDocument();
  });

  test('DG en transit voit la décharge mais pas les actions métier', () => {
    afficherDetail({
      ...projetPreSignature,
      statut: 'en_attente_avis_dg',
      en_transit: true,
      necessite_avis_dg: true,
      urgence_triee_at: '2026-09-29T00:00:00Z',
      degre_urgence: 'urgent',
      dossier_id: 8,
      peut_ouvrir_nouveau_cycle: true,
    });

    expect(screen.getByRole('button', { name: 'Confirmer la réception' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Corriger' })).not.toBeInTheDocument();
    expect(screen.getByTestId('dossier-actions')).toHaveAttribute('data-autoriser-actions', 'false');
    expect(screen.getByTestId('mission-actions')).toHaveAttribute('data-autoriser-actions', 'false');
    expect(screen.getByTestId('dispatch-actions')).toHaveAttribute('data-autoriser-actions', 'false');
  });

  test('après décharge DG, les actions métier autorisées réapparaissent', () => {
    afficherDetail({
      ...projetPreSignature,
      statut: 'en_attente_avis_dg',
      en_transit: false,
      necessite_avis_dg: true,
      urgence_triee_at: '2026-09-29T00:00:00Z',
      degre_urgence: 'urgent',
      dossier_id: 8,
      peut_ouvrir_nouveau_cycle: true,
    });

    expect(screen.queryByRole('button', { name: 'Confirmer la réception' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corriger' })).toBeInTheDocument();
    expect(screen.getByTestId('dossier-actions')).toHaveAttribute('data-autoriser-actions', 'true');
    expect(screen.getByTestId('mission-actions')).toHaveAttribute('data-autoriser-actions', 'true');
    expect(screen.getByTestId('dispatch-actions')).toHaveAttribute('data-autoriser-actions', 'true');
  });

  test('SEC1 peut transmettre à la DG un courrier normal au classeur sans décharge locale', () => {
    afficherDetail({
      ...projetPreSignature,
      statut: 'en_attente_classeur',
      sens: 'entrant',
      en_transit: false,
      necessite_avis_dg: true,
      degre_urgence: 'normal',
    }, { id: 10, name: 'Secrétariat 01', poste: 'secretariat_1' });

    expect(screen.getByRole('heading', { name: "Au classeur d'attente" })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transmettre à la DG' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmer la réception' })).not.toBeInTheDocument();
  });
});