import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GrilleEvaluationForm, grilleVide, totalGrille } from './GrilleEvaluationForm';

function Wrapper({ initial, ...props }) {
  const [valeurs, setValeurs] = useState(initial ?? grilleVide());
  return <GrilleEvaluationForm valeurs={valeurs} onChange={setValeurs} {...props} />;
}

describe('GrilleEvaluationForm', () => {
  test('le total général se met à jour au fur et à mesure de la saisie', async () => {
    const utilisateur = userEvent.setup();
    render(<Wrapper />);

    expect(screen.getByText('0 / 100')).toBeInTheDocument();

    await utilisateur.type(screen.getByLabelText(/Connaissance du métier/), '8');

    expect(screen.getByText('8 / 100')).toBeInTheDocument();

    await utilisateur.type(screen.getByLabelText(/Esprit d'initiative/), '7');

    expect(screen.getByText('15 / 100')).toBeInTheDocument();
  });

  test('le sous-total de chaque section est affiché séparément du total général', async () => {
    const utilisateur = userEvent.setup();
    render(<Wrapper />);

    await utilisateur.type(screen.getByLabelText(/Connaissance du métier/), '10');

    expect(screen.getByText('10 / 50')).toBeInTheDocument();
  });

  test('en lecture seule, les champs sont affichés en texte plutôt quen entrées de formulaire', () => {
    const valeurs = grilleVide();
    valeurs.aptitudes_professionnelles.connaissance_metier = '9';

    render(<GrilleEvaluationForm valeurs={valeurs} onChange={() => {}} readOnly />);

    expect(screen.queryByLabelText(/Connaissance du métier/)).not.toBeInTheDocument();
    expect(screen.getByText('9 / 10')).toBeInTheDocument();
  });

  test('totalGrille ignore les champs vides et non numériques', () => {
    const valeurs = grilleVide();
    valeurs.aptitudes_professionnelles.connaissance_metier = '5';
    valeurs.presentation.ponctualite = '3';

    expect(totalGrille(valeurs)).toBe(8);
  });
});
