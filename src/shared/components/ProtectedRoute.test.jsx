import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuthStore } from '../../modules/kernel/store/authStore';

function PageProtegee() {
  return <p>Contenu protégé</p>;
}

function PageAccueil() {
  return <p>Accueil</p>;
}

function PageConnexion() {
  return <p>Connexion</p>;
}

function PageChangerMotDePasse() {
  return <p>Changer le mot de passe</p>;
}

function rendre({ initialEntries = ['/protege'], roles, postes } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/connexion" element={<PageConnexion />} />
        <Route path="/" element={<PageAccueil />} />
        <Route element={<ProtectedRoute roles={roles} postes={postes} />}>
          <Route path="/protege" element={<PageProtegee />} />
          <Route path="/changer-mot-de-passe" element={<PageChangerMotDePasse />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const ETAT_INITIAL = useAuthStore.getState();

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState(ETAT_INITIAL, true);
  });

  afterEach(() => {
    useAuthStore.setState(ETAT_INITIAL, true);
  });

  test('redirige vers la connexion sans utilisateur authentifié', () => {
    rendre();

    expect(screen.getByText('Connexion')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });

  test('laisse passer un utilisateur authentifié sans restriction de rôle', () => {
    useAuthStore.setState({ token: 'jeton', user: { id: 1, role: 'administrateur', poste: null } });

    rendre();

    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });

  test('redirige vers laccueil si le rôle de lutilisateur ne correspond pas', () => {
    useAuthStore.setState({ token: 'jeton', user: { id: 1, role: 'agent_dfp', poste: null } });

    rendre({ roles: ['administrateur'] });

    expect(screen.getByText('Accueil')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });

  test('laisse passer un utilisateur dont le rôle correspond', () => {
    useAuthStore.setState({ token: 'jeton', user: { id: 1, role: 'agent_dfp', poste: null } });

    rendre({ roles: ['agent_dfp'] });

    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });

  test('redirige vers laccueil si le poste de lutilisateur ne correspond pas', () => {
    useAuthStore.setState({
      token: 'jeton',
      user: { id: 1, role: 'agent_circuit_courrier', poste: 'reception' },
    });

    rendre({ roles: ['agent_circuit_courrier'], postes: ['dg'] });

    expect(screen.getByText('Accueil')).toBeInTheDocument();
  });

  test('laisse passer un utilisateur dont le poste correspond', () => {
    useAuthStore.setState({
      token: 'jeton',
      user: { id: 1, role: 'agent_circuit_courrier', poste: 'dg' },
    });

    rendre({ roles: ['agent_circuit_courrier'], postes: ['dg'] });

    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });

  test('redirige vers le changement de mot de passe tant quil est imposé, même vers une route par ailleurs autorisée', () => {
    useAuthStore.setState({
      token: 'jeton',
      user: { id: 1, role: 'administrateur', poste: null, doit_changer_mot_de_passe: true },
    });

    rendre();

    expect(screen.getByText('Changer le mot de passe')).toBeInTheDocument();
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });
});
