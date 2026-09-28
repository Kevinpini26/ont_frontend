import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CourrierDetailPage } from './CourrierDetailPage';

const mocks = vi.hoisted(() => ({ courrier: null }));

vi.mock('../../../shared/hooks/useRequete', () => ({
  useRequete: () => ({ donnees: mocks.courrier, setDonnees: vi.fn(), chargement: false }),
}));
vi.mock('../../kernel/store/authStore', () => ({
  useAuthStore: (selector) => selector({ user: { id: 1, name: 'DG', poste: 'dg' } }),
}));
vi.mock('../../kernel/hooks/useDgAutorite', () => ({ useDgAutorite: () => true }));
vi.mock('../components/StatutTimeline', () => ({ StatutTimeline: () => null }));
vi.mock('../components/BordereauxTimeline', () => ({ BordereauxTimeline: () => null }));
vi.mock('../components/AnnotationsPanel', () => ({ AnnotationsPanel: () => null }));
vi.mock('../components/NumerisationPanel', () => ({ NumerisationPanel: () => null }));
vi.mock('../components/DossierDocumentsPanel', () => ({ DossierDocumentsPanel: () => null }));
vi.mock('../components/MissionsDocumentairesPanel', () => ({ MissionsDocumentairesPanel: () => null }));
vi.mock('../components/DispatchDecisionPanel', () => ({ DispatchDecisionPanel: () => null }));
vi.mock('../components/DocumentPreviewModal', () => ({ DocumentPreviewModal: () => null }));
vi.mock('../components/TipTapEditor', () => ({
  TipTapEditor: ({ content }) => <div>{content?.content?.[0]?.content?.[0]?.text}</div>,
}));

afterEach(() => {
  cleanup();
  mocks.courrier = null;
});

function afficherDetail(courrier) {
  mocks.courrier = courrier;
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
  test('affiche le statut, le contenu final, le destinataire et le CTA DG avant signature', () => {
    afficherDetail(projetPreSignature);

    expect(screen.getByText('Projet prêt à signer')).toBeInTheDocument();
    expect(screen.getByText('Texte final de la réponse')).toBeInTheDocument();
    expect(screen.getByText('Partenaire')).toBeInTheDocument();
    expect(screen.getByText('partenaire@example.test')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Signer la réponse' })).toBeInTheDocument();
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
});