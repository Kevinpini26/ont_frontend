import { describe, expect, test } from 'vitest';
import { formaterDateHeure } from './dateHeure';

describe('formaterDateHeure', () => {
  test('convertit un instant UTC dans le fuseau demandé', () => {
    expect(formaterDateHeure('2026-09-29T00:10:00.000Z', 'Africa/Kinshasa')).toBe('29/09/2026 01:10');
  });

  test('respecte un offset ISO déjà exprimé dans le même fuseau', () => {
    expect(formaterDateHeure('2026-09-29T01:10:00+01:00', 'Africa/Kinshasa')).toBe('29/09/2026 01:10');
  });

  test.each([null, undefined, '', 'Invalid Date'])('retourne null pour une valeur absente ou invalide (%s)', (valeur) => {
    expect(formaterDateHeure(valeur)).toBeNull();
  });
});