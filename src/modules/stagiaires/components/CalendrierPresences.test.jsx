import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendrierPresences } from './CalendrierPresences';
import * as stagiairesApi from '../api/stagiairesApi';

const STAGIAIRE = {
  id: 1,
  date_debut_stage: '2026-06-01',
  date_fin_stage: '2026-06-30',
  assiduite_suggestion: null,
};

describe('CalendrierPresences', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-06-30T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('les samedis et dimanches ne sont jamais sélectionnables', () => {
    render(<CalendrierPresences stagiaire={STAGIAIRE} presences={[]} onChange={() => {}} />);

    // Samedi 6 et dimanche 7 juin 2026.
    expect(screen.getByRole('button', { name: /2026-06-06/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /2026-06-07/ })).toBeDisabled();
    // Un jour ouvré de la même semaine reste actionnable.
    expect(screen.getByRole('button', { name: /2026-06-05/ })).toBeEnabled();
  });

  test('un jour ouvré non coché se marque présent en un clic, avec les heures par défaut', async () => {
    const utilisateur = userEvent.setup({ delay: null });
    const enregistrerPresence = vi
      .spyOn(stagiairesApi, 'enregistrerPresence')
      .mockResolvedValue({ date: '2026-06-15', heure_arrivee: '08:30:00', heure_depart: '15:30:00' });
    const onChange = vi.fn();

    render(<CalendrierPresences stagiaire={STAGIAIRE} presences={[]} onChange={onChange} />);

    await utilisateur.click(screen.getByRole('button', { name: /2026-06-15/ }));

    expect(enregistrerPresence).toHaveBeenCalledWith(1, '2026-06-15', '08:30', '15:30');
    expect(onChange).toHaveBeenCalled();
  });

  test('un jour déjà coché ouvre léditeur plutôt que de créer un second pointage', async () => {
    const utilisateur = userEvent.setup({ delay: null });
    const enregistrerPresence = vi.spyOn(stagiairesApi, 'enregistrerPresence').mockResolvedValue({});

    const presences = [{ date: '2026-06-15', heure_arrivee: '08:25:00', heure_depart: '15:40:00' }];
    render(<CalendrierPresences stagiaire={STAGIAIRE} presences={presences} onChange={() => {}} />);

    await utilisateur.click(screen.getByRole('button', { name: /2026-06-15, présent/ }));

    // Aucun nouveau pointage déclenché par ce clic : l'éditeur inline
    // s'ouvre à la place, préchargé avec les heures existantes.
    expect(enregistrerPresence).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Heure d'arrivée")).toHaveValue('08:25');
    expect(screen.getByLabelText('Heure de départ')).toHaveValue('15:40');
  });
});
