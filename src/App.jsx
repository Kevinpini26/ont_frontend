import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './shared/components/AppLayout';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { ROLES } from './modules/kernel/constants';
import { useThemeSync } from './shared/hooks/useThemeSync';

import { LoginPage } from './modules/kernel/pages/LoginPage';
import { ChangerMotDePassePage } from './modules/kernel/pages/ChangerMotDePassePage';
import { MotDePasseOubliePage } from './modules/kernel/pages/MotDePasseOubliePage';
import { ReinitialiserMotDePassePage } from './modules/kernel/pages/ReinitialiserMotDePassePage';
import { AdminDirectionsPage } from './modules/kernel/pages/AdminDirectionsPage';
import { AdminUsersPage } from './modules/kernel/pages/AdminUsersPage';
import { AdminAuditLogPage } from './modules/kernel/pages/AdminAuditLogPage';
import { AdminRapportsPage } from './modules/kernel/pages/AdminRapportsPage';

import { CourrierDetailPage } from './modules/courrier/pages/CourrierDetailPage';
import { CircuitQueuePage } from './modules/courrier/pages/CircuitQueuePage';
import { CourrierCircuitDashboardPage } from './modules/courrier/pages/CourrierCircuitDashboardPage';
import { CourrierDgDashboardPage } from './modules/courrier/pages/CourrierDgDashboardPage';
import { DirectionDashboardPage } from './modules/courrier/pages/DirectionDashboardPage';
import { DirectionCourrierPage } from './modules/courrier/pages/DirectionCourrierPage';
import { DirectionStagiairesPage } from './modules/courrier/pages/DirectionStagiairesPage';

import { DfpDashboardPage } from './modules/stagiaires/pages/DfpDashboardPage';
import { DfpCourrierPage } from './modules/stagiaires/pages/DfpCourrierPage';
import { DfpStagiairesPage } from './modules/stagiaires/pages/DfpStagiairesPage';
import { DfpStatistiquesPage } from './modules/stagiaires/pages/DfpStatistiquesPage';
import { DisponibiliteDemandesPage } from './modules/stagiaires/pages/DisponibiliteDemandesPage';
import { DemandesStagePage } from './modules/stagiaires/pages/DemandesStagePage';
import { PresencesApercuPage } from './modules/stagiaires/pages/PresencesApercuPage';
import { StagiaireDetailPage } from './modules/stagiaires/pages/StagiaireDetailPage';
import { HistoriqueStagiairesPage } from './modules/stagiaires/pages/HistoriqueStagiairesPage';
import { AdminImportHistoriquePage } from './modules/stagiaires/pages/AdminImportHistoriquePage';

import { PublicLayout } from './modules/public/components/PublicLayout';
import { HomePage } from './modules/public/pages/HomePage';
import { AboutPage } from './modules/public/pages/AboutPage';
import { ServicesPage } from './modules/public/pages/ServicesPage';
import { PublicDossierLookupPage } from './modules/public/pages/PublicDossierLookupPage';
import { PublicDemandeStagePage } from './modules/public/pages/PublicDemandeStagePage';
import { CourrierExternePage } from './modules/public/pages/CourrierExternePage';
import { PublicLienPage } from './modules/public/pages/PublicLienPage';
import { PublicAttestationVerificationPage } from './modules/public/pages/PublicAttestationVerificationPage';

/** Redirection d'un ancien chemin renommé, en conservant la query string (ex. ?numero=...). */
function RedirectAvecQuery({ vers }) {
  const location = useLocation();
  return <Navigate to={`${vers}${location.search}`} replace />;
}

function AppRoutes() {
  useThemeSync(useLocation().pathname);

  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/mot-de-passe-oublie" element={<MotDePasseOubliePage />} />
      <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePassePage />} />
      <Route path="/verification-attestation" element={<PublicAttestationVerificationPage />} />
      <Route path="/verification-attestation/:numero" element={<PublicAttestationVerificationPage />} />
      <Route path="/liens/:token" element={<PublicLienPage />} />

      {/* Anciens chemins, conservés en redirection pour ne pas casser un lien déjà partagé (email, favori). */}
      <Route path="/demande-stage" element={<RedirectAvecQuery vers="/demande-de-stage" />} />
      <Route path="/verification-dossier" element={<RedirectAvecQuery vers="/suivi-dossier" />} />

      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/demande-de-stage" element={<PublicDemandeStagePage />} />
        <Route path="/depot-courrier-externe" element={<CourrierExternePage />} />
        <Route path="/suivi-dossier" element={<PublicDossierLookupPage />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route element={<ProtectedRoute roles={[ROLES.ADMINISTRATEUR]} />}>
          <Route path="/admin/directions" element={<AdminDirectionsPage />} />
          <Route path="/admin/utilisateurs" element={<AdminUsersPage />} />
          <Route path="/admin/journal-audit" element={<AdminAuditLogPage />} />
          <Route path="/admin/rapports" element={<AdminRapportsPage />} />
          <Route path="/admin/import-historique" element={<AdminImportHistoriquePage />} />
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.RESPONSABLE_DIRECTION]} />}>
          <Route path="/direction/tableau-de-bord" element={<DirectionDashboardPage />} />
          <Route path="/direction/courrier" element={<DirectionCourrierPage />} />
          <Route path="/direction/stagiaires" element={<DirectionStagiairesPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.AGENT_CIRCUIT_COURRIER]} />}>
          <Route path="/circuit/tableau-de-bord" element={<CourrierCircuitDashboardPage />} />
          <Route path="/circuit/:poste" element={<CircuitQueuePage />} />
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.AGENT_CIRCUIT_COURRIER]} postes={['dg']} />}>
          <Route path="/circuit/espace-dg" element={<CourrierDgDashboardPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={[ROLES.AGENT_DFP]} />}>
          <Route path="/stagiaires/dashboard" element={<DfpDashboardPage />} />
          <Route path="/stagiaires/courrier" element={<DfpCourrierPage />} />
          <Route path="/stagiaires/actifs" element={<DfpStagiairesPage />} />
          <Route path="/stagiaires/historique" element={<HistoriqueStagiairesPage />} />
          <Route path="/stagiaires/statistiques" element={<DfpStatistiquesPage />} />
          <Route path="/stagiaires/demandes" element={<DemandesStagePage />} />
          <Route path="/stagiaires/presences" element={<PresencesApercuPage />} />
          <Route path="/stagiaires/parametres" element={<DisponibiliteDemandesPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/courriers/:id" element={<CourrierDetailPage />} />
          <Route path="/stagiaires/:id" element={<StagiaireDetailPage />} />
          <Route path="/changer-mot-de-passe" element={<ChangerMotDePassePage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
