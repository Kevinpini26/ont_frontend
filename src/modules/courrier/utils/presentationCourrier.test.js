import { describe, expect, test } from 'vitest';
import { libelleStatutCourrier } from './presentationCourrier';

describe('libelleStatutCourrier', () => {
  test.each([
    [{ statut: 'projet_a_rediger' }, 'Projet de réponse à rédiger'],
    [{ statut: 'projet_a_valider', relecture_validee_at: null }, 'Projet en attente de validation'],
    [{ statut: 'projet_a_valider', relecture_validee_at: '2026-09-29T00:26:57Z' }, 'Projet prêt à signer'],
    [{ statut: 'signe' }, 'Signé'],
    [{ statut: 'envoye' }, 'Envoyé'],
  ])('dérive le libellé depuis le statut et les données de relecture', (courrier, attendu) => {
    expect(libelleStatutCourrier(courrier)).toBe(attendu);
  });
});