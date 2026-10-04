import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DispatchDecisionPanel } from './DispatchDecisionPanel';
import { deciderDispatch } from '../api/courrierApi';

vi.mock('../api/courrierApi', () => ({ deciderDispatch: vi.fn() }));
vi.mock('../../kernel/api/directionsApi', () => ({ listDirections: vi.fn().mockResolvedValue([]) }));

const user = { id: 1, poste: 'dg', source_autorite_dg: 'titulaire' };
const dispatchs = [
  { id: 1, cycle: 1, type_destination_label: 'Direction', direction: { nom: 'DMC' }, statut: 'execute', statut_label: 'Exécuté', traitement_direction: { recu_secretariat_at: '2026-01-01', statut_label: 'Terminé' } },
  { id: 2, cycle: 2, type_destination_label: 'Classement', statut: 'execute', statut_label: 'Exécuté' },
];

afterEach(cleanup);

describe('DispatchDecisionPanel — cycles successifs', () => {
  test('affiche les cycles historiques et propose une décision lorsque le backend la permet', () => {
    render(<DispatchDecisionPanel courrier={{ id: 1, dispatchs, peut_ouvrir_nouveau_cycle: true }} user={user} onUpdate={vi.fn()} />);

    expect(screen.getByText(/Cycle 1 · Direction — DMC/)).toBeInTheDocument();
    expect(screen.getByText(/Cycle 2 · Classement/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transmettre à SEC2' })).toBeInTheDocument();
  });

  test.each(['traitement actif', 'courrier archivé'])('ne propose aucune nouvelle décision pour un %s', () => {
    render(<DispatchDecisionPanel courrier={{ id: 1, dispatchs, peut_ouvrir_nouveau_cycle: false }} user={user} onUpdate={vi.fn()} />);

    expect(screen.getByText(/Cycle 1 · Direction — DMC/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transmettre à SEC2' })).not.toBeInTheDocument();
  });

  test('conserve l’historique mais masque une nouvelle décision tant que la DG n’a pas déchargé', () => {
    render(<DispatchDecisionPanel
      courrier={{ id: 1, dispatchs, peut_ouvrir_nouveau_cycle: true }}
      user={user}
      onUpdate={vi.fn()}
      autoriserActions={false}
    />);

    expect(screen.getByText(/Cycle 1 · Direction — DMC/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transmettre à SEC2' })).not.toBeInTheDocument();
  });

  test('la capability de classement affiche une action unique et envoie directement CLASSEMENT', async () => {
    const courrierMisAJour = { id: 42, statut: 'envoye', dispatchs: [] };
    const onUpdate = vi.fn();
    vi.mocked(deciderDispatch).mockResolvedValue(courrierMisAJour);
    render(<DispatchDecisionPanel
      courrier={{ id: 42, statut: 'envoye', dispatchs: [], peut_ouvrir_nouveau_cycle: false, peut_decider_classement: true }}
      user={user}
      onUpdate={onUpdate}
    />);

    expect(screen.getByRole('button', { name: 'Décider le classement' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Destination/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ajouter une destination' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transmettre à SEC2' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Décider le classement' }));
    await waitFor(() => expect(deciderDispatch).toHaveBeenCalledWith(42, [{
      type: 'classement',
      instruction: 'Classement documentaire après sortie complète.',
    }]));
    expect(onUpdate).toHaveBeenCalledWith(courrierMisAJour);
  });

  test('affiche la même action lorsque la capability autorise le DGA intérimaire', () => {
    render(<DispatchDecisionPanel
      courrier={{ id: 45, statut: 'remis', dispatchs: [], peut_decider_classement: true, peut_ouvrir_nouveau_cycle: false }}
      user={{ id: 2, poste: 'dga', source_autorite_dg: 'interim_dga' }}
      onUpdate={vi.fn()}
    />);

    expect(screen.getByRole('button', { name: 'Décider le classement' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Transmettre à SEC2' })).not.toBeInTheDocument();
  });

  test.each([
    ['DGA hors intérim', { id: 2, poste: 'dga', source_autorite_dg: null }],
    ['SEC1', { id: 3, poste: 'secretariat_1' }],
    ['SEC2', { id: 4, poste: 'secretariat_2' }],
    ['direction', { id: 5, role: 'directeur_direction' }],
    ['assistant DG', { id: 6, poste: 'assistant_1' }],
    ['assistant DGA', { id: 7, poste: 'assistant_dga' }],
    ['admin', { id: 8, role: 'administrateur' }],
  ])('respecte la capability false pour %s même avec un statut terminal', (_label, userSansAutorite) => {
    render(<DispatchDecisionPanel
      courrier={{ id: 43, statut: 'remis', mode_sortie: 'courriel_et_retrait', dispatchs: [], peut_ouvrir_nouveau_cycle: false, peut_decider_classement: false }}
      user={userSansAutorite}
      onUpdate={vi.fn()}
    />);

    expect(screen.queryByRole('button', { name: 'Décider le classement' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Destination/)).not.toBeInTheDocument();
  });

  test('affiche séparément la réception et le classement documentaire du statut livraison', () => {
    render(<DispatchDecisionPanel
      courrier={{
        id: 46,
        statut: 'remis',
        classement: null,
        dispatchs: [{
          id: 9,
          cycle: 1,
          type_destination: 'classement',
          type_destination_label: 'Classement',
          statut: 'en_attente',
          statut_label: 'En attente',
          peut_accuser_reception: true,
          instruction: 'Après livraison',
        }],
        peut_decider_classement: false,
        peut_ouvrir_nouveau_cycle: false,
      }}
      user={{ id: 4, poste: 'secretariat_2' }}
      onUpdate={vi.fn()}
    />);

    expect(screen.getByText(/à réceptionner par SEC2/i)).toBeInTheDocument();
    expect(screen.queryByText('EN_DISPATCH')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Décider le classement' })).not.toBeInTheDocument();
  });

  test('préserve le panneau générique pour les cycles historiques autorisés par le backend', () => {
    render(<DispatchDecisionPanel
      courrier={{ id: 44, statut: 'dispatch_execute', mode_sortie: null, dispatchs, peut_decider_classement: false, peut_ouvrir_nouveau_cycle: true }}
      user={user}
      onUpdate={vi.fn()}
    />);

    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Transmettre à SEC2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Décider le classement' })).not.toBeInTheDocument();
  });
});
