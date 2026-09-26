import { describe, expect, test } from 'vitest';
import { POSTES_ASSISTANTS } from './constants';
import { estDirecteurDirection, POSTES, POSTE_LABELS, ROLES } from '../kernel/constants';

describe('postes historiques du Protocole', () => {
  test('ne sont plus proposés parmi les postes attribuables', () => {
    expect(Object.values(POSTES)).not.toContain('protocole');
    expect(Object.values(POSTES)).not.toContain('assistant_protocole');
  });

  test('restent libellés pour afficher les historiques', () => {
    expect(POSTE_LABELS.protocole).toContain('historique');
    expect(POSTE_LABELS.assistant_protocole).toContain('historique');
  });

  test('la file de rédaction reste ouverte aux trois assistants actifs', () => {
    expect(POSTES_ASSISTANTS).toEqual(['assistant_1', 'assistant_2', 'assistant_dga']);
  });
});

describe('compatibilité du rôle directeur de direction', () => {
  test('reconnaît le nouveau rôle et la valeur historique', () => {
    expect(estDirecteurDirection({ role: ROLES.DIRECTEUR_DIRECTION })).toBe(true);
    expect(estDirecteurDirection({ role: ROLES.RESPONSABLE_DIRECTION })).toBe(true);
    expect(estDirecteurDirection({ role: ROLES.SECRETARIAT_DIRECTION })).toBe(false);
  });
});
