import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DispatchDecisionPanel } from './DispatchDecisionPanel';

vi.mock('../api/courrierApi', () => ({ deciderDispatch: vi.fn() }));
vi.mock('../../kernel/api/directionsApi', () => ({ listDirections: vi.fn().mockResolvedValue([]) }));

const user = { id: 1, poste: 'dg' };
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
});
