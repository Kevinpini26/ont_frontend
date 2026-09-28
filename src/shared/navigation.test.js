import { describe, expect, test } from 'vitest';
import { navigationForUser } from './navigation';

describe('navigationForUser', () => {
  test("l'assistant DGA ne reçoit que son espace de missions, sans tableau de bord global", () => {
    const sections = navigationForUser({
      role: 'agent_circuit_courrier',
      poste: 'assistant_dga',
      poste_delegue: null,
    });
    const destinations = sections.flatMap((section) => section.items.map((item) => item.to));

    expect(destinations).toContain('/circuit/missions');
    expect(destinations).not.toContain('/circuit/tableau-de-bord');
    expect(destinations).not.toContain('/circuit/centre-dispatch');
    expect(destinations).not.toContain('/circuit/archivage-dossiers');
  });
});
