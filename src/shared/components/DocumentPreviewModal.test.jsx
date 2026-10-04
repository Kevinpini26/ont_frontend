import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { apiClient } from '../api/client';

// jsdom n'implémente pas createObjectURL/revokeObjectURL : à définir
// nous-mêmes plutôt que de remplacer tout l'objet URL global (ce qui
// casserait le routage et axios, qui en dépendent aussi).
URL.createObjectURL = vi.fn(() => 'blob:test-url');
URL.revokeObjectURL = vi.fn();

describe('DocumentPreviewModal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('affiche un chargement puis lembed PDF une fois le document récupéré', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: new Blob(['contenu'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' },
    });

    render(<DocumentPreviewModal open title="Convention" url="/stagiaires/1/documents/2/telecharger" onClose={() => {}} />);

    await waitFor(() => expect(document.querySelector('embed[type="application/pdf"]')).toBeInTheDocument());
  });

  test('affiche un message derreur si la récupération échoue', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('échec réseau'));

    render(<DocumentPreviewModal open title="Convention" url="/stagiaires/1/documents/2/telecharger" onClose={() => {}} />);

    expect(await screen.findByText('Impossible de charger le document.')).toBeInTheDocument();
  });

  test('affiche bien le PDF quand le header inclut un charset', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf; charset=UTF-8' },
    });

    render(<DocumentPreviewModal open title="Convention" url="/stagiaires/1/documents/2/telecharger" onClose={() => {}} />);

    await waitFor(() => expect(document.querySelector('embed[type="application/pdf"]')).toBeInTheDocument());
  });

  test('rien ne se charge tant que la modale nest pas ouverte', () => {
    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: new Blob(), headers: {} });

    render(<DocumentPreviewModal open={false} title="Convention" url="/stagiaires/1/documents/2/telecharger" onClose={() => {}} />);

    expect(getSpy).not.toHaveBeenCalled();
  });

  test('le bouton fermer renvoie le focus et déclenche onClose', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: new Blob(['contenu'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' },
    });
    const onClose = vi.fn();
    const utilisateur = userEvent.setup({ delay: null });

    render(<DocumentPreviewModal open title="Convention" url="/stagiaires/1/documents/2/telecharger" onClose={onClose} />);

    await utilisateur.click(screen.getByRole('button', { name: 'Fermer' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
