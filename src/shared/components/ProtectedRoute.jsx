import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../modules/kernel/store/authStore';

export function ProtectedRoute({ roles, postes, postesInterdits, postesNatifs }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/connexion" replace />;
  }

  // Mot de passe attribué par l'administrateur : bloque tout le reste de
  // l'API côté backend (voir EnsureMotDePasseAJour) — la route de
  // changement elle-même doit rester atteignable, sinon plus aucune sortie.
  if (user.doit_changer_mot_de_passe && location.pathname !== '/changer-mot-de-passe') {
    return <Navigate to="/changer-mot-de-passe" replace />;
  }

  const delegationDg = user.poste_delegue === 'dg';
  if (roles && !roles.includes(user.role) && !(delegationDg && roles.includes('agent_circuit_courrier'))) {
    return <Navigate to="/" replace />;
  }

  if (postes && !postes.includes(user.poste) && !(delegationDg && postes.includes('dg'))) {
    return <Navigate to="/" replace />;
  }

  if (postesInterdits?.includes(user.poste)) {
    return <Navigate to="/" replace />;
  }
  if (postesNatifs && !postesNatifs.includes(user.poste)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
