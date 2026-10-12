import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import { navigationForUser } from './navigation';
import { useAuthStore } from '../modules/kernel/store/authStore';

vi.mock('./components/AppLayout', async () => {
  const React = await import('react');
  const { Outlet } = await import('react-router-dom');
  return { AppLayout: () => React.createElement(Outlet) };
});

vi.mock('./hooks/useThemeSync', () => ({ useThemeSync: vi.fn() }));

vi.mock('../modules/kernel/hooks/useDgAutorite', () => ({
  useDgAutorite: (active) => (active ? true : undefined),
}));

vi.mock('../modules/public/pages/HomePage', async () => {
  const React = await import('react');
  return { HomePage: () => React.createElement('div', null, 'HOME_ROUTE') };
});

vi.mock('../modules/courrier/pages/DocumentsInternesDirectionPage', async () => {
  const React = await import('react');
  return { DocumentsInternesDirectionPage: () => React.createElement('div', null, 'INTERNAL_LIST_ROUTE') };
});

vi.mock('../modules/courrier/pages/DocumentInterneAutonomePage', async () => {
  const React = await import('react');
  return { DocumentInterneAutonomePage: () => React.createElement('div', null, 'INTERNAL_DOCUMENT_ROUTE') };
});

vi.mock('../modules/courrier/pages/DocumentsInternesDirecteurPage', async () => {
  const React = await import('react');
  return { DocumentsInternesDirecteurPage: () => React.createElement('div', null, 'DIRECTOR_INTERNAL_LIST_ROUTE') };
});

vi.mock('../modules/courrier/pages/DocumentInterneDirecteurPage', async () => {
  const React = await import('react');
  return { DocumentInterneDirecteurPage: () => React.createElement('div', null, 'DIRECTOR_INTERNAL_DOCUMENT_ROUTE') };
});

import { AppRoutes } from '../App';

const routesInternes = [
  '/direction/documents-internes',
  '/direction/documents-internes/nouveau',
  '/direction/documents-internes/15',
];
const routesInternesDirecteur = [
  '/direction/directeur/documents-internes',
  '/direction/directeur/documents-internes/15',
];

function ouvrirRouteInterne(path, user) {
  useAuthStore.setState({ user, token: 'test-token' });
  const router = createMemoryRouter([{ path: '*', element: createElement(AppRoutes) }], { initialEntries: [path] });
  return render(createElement(RouterProvider, { router }));
}

describe('navigationForUser', () => {
  test('réserve les documents internes autonomes au secrétariat de direction', () => {
    const secretariat = navigationForUser({ role: 'secretariat_direction' });
    const autresRoles = [
      { role: 'directeur_direction' },
      { role: 'agent_circuit_courrier', poste: 'reception' },
      { role: 'administrateur' },
      { role: 'agent_circuit_courrier', poste: 'secretariat_1' },
    ];

    expect(secretariat.flatMap((section) => section.items.map((item) => item.to))).toContain('/direction/documents-internes');
    for (const user of autresRoles) {
      expect(navigationForUser(user).flatMap((section) => section.items.map((item) => item.to))).not.toContain('/direction/documents-internes');
    }
  });

  test('réserve le menu Directeur des documents internes aux deux rôles Directeur', () => {
    for (const role of ['directeur_direction', 'responsable_direction']) {
      const destinations = navigationForUser({ role }).flatMap((section) => section.items.map((item) => item.to));
      expect(destinations).toContain('/direction/directeur/documents-internes');
      expect(destinations).not.toContain('/direction/documents-internes');
    }
    for (const role of ['secretariat_direction', 'administrateur', 'agent_dfp']) {
      const destinations = navigationForUser({ role }).flatMap((section) => section.items.map((item) => item.to));
      expect(destinations).not.toContain('/direction/directeur/documents-internes');
    }
  });

  describe('routes des documents internes autonomes', () => {
    test.each(routesInternes)('autorise l’accès direct au secrétariat : %s', async (path) => {
      ouvrirRouteInterne(path, { role: 'secretariat_direction', poste: 'secretariat_direction' });
      const marqueur = path.endsWith('/nouveau') || path.match(/\/\d+$/)
        ? 'INTERNAL_DOCUMENT_ROUTE'
        : 'INTERNAL_LIST_ROUTE';
      expect(await screen.findByText(marqueur)).toBeInTheDocument();
      cleanup();
    });

    describe('routes Directeur des documents internes', () => {
      test.each(['directeur_direction', 'responsable_direction'])('autorise le rôle %s', async (role) => {
        for (const path of routesInternesDirecteur) {
          ouvrirRouteInterne(path, { role });
          const marker = path.endsWith('/15') ? 'DIRECTOR_INTERNAL_DOCUMENT_ROUTE' : 'DIRECTOR_INTERNAL_LIST_ROUTE';
          expect(await screen.findByText(marker)).toBeInTheDocument();
          cleanup();
        }
      });

      test.each([
        { role: 'secretariat_direction' },
        { role: 'administrateur' },
        { role: 'agent_dfp' },
        { role: 'agent_circuit_courrier', poste: 'reception' },
        { role: 'agent_circuit_courrier', poste: 'secretariat_1' },
        { role: 'agent_circuit_courrier', poste: 'dg' },
      ])('refuse les routes Directeur au profil non assigné : %#', async (user) => {
        for (const path of routesInternesDirecteur) {
          ouvrirRouteInterne(path, user);
          expect(await screen.findByText('HOME_ROUTE')).toBeInTheDocument();
          expect(screen.queryByText(/DIRECTOR_INTERNAL_/)).not.toBeInTheDocument();
          cleanup();
        }
      });
    });

    test.each([
      { role: 'directeur_direction' },
      { role: 'responsable_direction' },
      { role: 'administrateur' },
      { role: 'agent_dfp' },
      { role: 'agent_circuit_courrier', poste: 'reception' },
      { role: 'agent_circuit_courrier', poste: 'secretariat_1' },
      { role: 'agent_circuit_courrier', poste: 'secretariat_2' },
      { role: 'agent_circuit_courrier', poste: 'dg' },
      { role: 'agent_circuit_courrier', poste: 'dga' },
      { role: 'agent_circuit_courrier', poste: 'assistant_1' },
    ])('refuse les routes directes à un profil non secrétariat : %#', async (user) => {
      for (const path of routesInternes) {
        ouvrirRouteInterne(path, { ...user, poste_delegue: user.poste === 'assistant_dga' ? 'dg' : null });
        expect(await screen.findByText('HOME_ROUTE')).toBeInTheDocument();
        expect(screen.queryByText(/INTERNAL_/)).not.toBeInTheDocument();
        cleanup();
      }
    });

    test('refuse aussi un utilisateur délégué DG dont le rôle natif est agent de circuit', async () => {
      ouvrirRouteInterne('/direction/documents-internes/15', {
        role: 'agent_circuit_courrier',
        poste: 'assistant_dga',
        poste_delegue: 'dg',
      });
      await waitFor(() => expect(screen.getByText('HOME_ROUTE')).toBeInTheDocument());
      expect(screen.queryByText('INTERNAL_DOCUMENT_ROUTE')).not.toBeInTheDocument();
      cleanup();
    });
  });

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
