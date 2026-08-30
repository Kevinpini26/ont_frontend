import { describe, expect, test } from 'vitest';
import { hasPoste, hasRole } from './authStore';

describe('hasRole', () => {
  test('renvoie faux quand aucun utilisateur nest connecte', () => {
    expect(hasRole(null, 'administrateur')).toBe(false);
  });

  test('renvoie vrai quand le role de lutilisateur correspond', () => {
    expect(hasRole({ role: 'administrateur' }, 'administrateur')).toBe(true);
  });

  test('renvoie faux quand le role ne correspond a aucun des roles fournis', () => {
    expect(hasRole({ role: 'agent_dfp' }, 'administrateur', 'responsable_direction')).toBe(false);
  });

  test('accepte plusieurs roles et renvoie vrai si lun deux correspond', () => {
    expect(hasRole({ role: 'agent_dfp' }, 'administrateur', 'agent_dfp')).toBe(true);
  });

  test('renvoie faux quand aucun role nest fourni', () => {
    expect(hasRole({ role: 'administrateur' })).toBe(false);
  });
});

describe('hasPoste', () => {
  test('renvoie faux quand aucun utilisateur nest connecte', () => {
    expect(hasPoste(null, 'reception')).toBe(false);
  });

  test('renvoie vrai quand le poste de lutilisateur correspond', () => {
    expect(hasPoste({ poste: 'reception' }, 'reception')).toBe(true);
  });

  test('renvoie faux pour un utilisateur sans poste (role non agent_circuit_courrier)', () => {
    expect(hasPoste({ poste: null }, 'reception', 'protocole')).toBe(false);
  });

  test('renvoie faux quand le poste ne correspond a aucun des postes fournis', () => {
    expect(hasPoste({ poste: 'secretariat_1' }, 'reception', 'protocole')).toBe(false);
  });
});
