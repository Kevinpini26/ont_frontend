import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GrilleEvaluationProfessionnelleForm, grilleProVide, totalGrillePro } from './GrilleEvaluationProfessionnelleForm';

function Wrapper(props) {
  const [valeurs, setValeurs] = useState(grilleProVide());
  return <GrilleEvaluationProfessionnelleForm valeurs={valeurs} onChange={setValeurs} {...props} />;
}

describe('GrilleEvaluationProfessionnelleForm', () => {
  test('le total général se met à jour au fur et à mesure de la saisie', async () => {
    const utilisateur = userEvent.setup();
    render(<Wrapper />);

    expect(screen.getByText('0 / 100 (0%)')).toBeInTheDocument();

    await utilisateur.type(screen.getByLabelText('Connaissance du métier (/10)'), '8');

    expect(screen.getByText('8 / 100 (8%)')).toBeInTheDocument();
  });

  test('en lecture seule, aucune entrée de formulaire nest rendue', () => {
    const valeurs = grilleProVide();
    valeurs.aspects_intellectuels.connaissance_metier = '7';

    render(<GrilleEvaluationProfessionnelleForm valeurs={valeurs} onChange={() => {}} readOnly />);

    expect(screen.queryByLabelText('Connaissance du métier (/10)')).not.toBeInTheDocument();
  });

  test('totalGrillePro additionne les dix rubriques des trois catégories', () => {
    const valeurs = grilleProVide();
    valeurs.aspects_intellectuels.connaissance_metier = '5';
    valeurs.aspects_humains.ponctualite_regularite = '4';
    valeurs.aspects_professionnels.capacite_innovation = '3';

    expect(totalGrillePro(valeurs)).toBe(12);
  });
});
