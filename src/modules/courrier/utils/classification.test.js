import { describe, expect, it } from 'vitest';
import { classificationAttendue } from './classification';

describe('classificationAttendue', () => {
  it('classe externe un courrier avec un expéditeur externe nommé', () => {
    expect(classificationAttendue({ expediteur_externe_nom: 'Ambassade de Belgique' })).toBe('externe');
  });

  it('classe externe un courrier avec un candidat (demande de stage)', () => {
    expect(classificationAttendue({ candidat: { nom: 'Grace Mbuyi Kalonji' } })).toBe('externe');
  });

  it(
    'classe externe un dépôt de la Réception sans direction d\'origine ni expéditeur nommé ' +
      '(le formulaire rapide "Nouveau courrier reçu" ne collecte pas toujours un nom d\'expéditeur)',
    () => {
      expect(classificationAttendue({ direction_origine: null, initie_par_dg: false })).toBe('externe');
    },
  );

  it('classe interne un courrier envoyé par une direction à une autre', () => {
    expect(classificationAttendue({ direction_origine: { id: 1, nom: 'DRHL' }, initie_par_dg: false })).toBe('interne');
  });

  it('classe interne un courrier initié par la DG, même sans direction d\'origine', () => {
    expect(classificationAttendue({ direction_origine: null, initie_par_dg: true })).toBe('interne');
  });
});
