import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './shared/components/AppLayout';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { LoadingBlock } from './shared/components/ui/Spinner';
import { ToastContainer } from './shared/components/ui/Toast';
import { ROLES, ROLES_DIRECTEUR_DIRECTION } from './modules/kernel/constants';
import { useThemeSync } from './shared/hooks/useThemeSync';

// Chargées à la demande : aucune de ces pages ne doit alourdir le paquet
// initial (voir index.html/premier rendu), notamment celles qui tirent
// @tiptap ou recharts — des dépendances lourdes qu'une session ne visite
// souvent jamais (ex. un agent DFP ne charge jamais l'éditeur de courrier).
const LoginPage = lazy(() => import('./modules/kernel/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ChangerMotDePassePage = lazy(() =>
  import('./modules/kernel/pages/ChangerMotDePassePage').then((m) => ({ default: m.ChangerMotDePassePage })),
);
const MotDePasseOubliePage = lazy(() =>
  import('./modules/kernel/pages/MotDePasseOubliePage').then((m) => ({ default: m.MotDePasseOubliePage })),
);
const ReinitialiserMotDePassePage = lazy(() =>
  import('./modules/kernel/pages/ReinitialiserMotDePassePage').then((m) => ({ default: m.ReinitialiserMotDePassePage })),
);
const AdminDirectionsPage = lazy(() =>
  import('./modules/kernel/pages/AdminDirectionsPage').then((m) => ({ default: m.AdminDirectionsPage })),
);
const AdminUsersPage = lazy(() => import('./modules/kernel/pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminDelegationsPostePage = lazy(() => import('./modules/kernel/pages/AdminDelegationsPostePage').then((m) => ({ default: m.AdminDelegationsPostePage })));
const AdminAuditLogPage = lazy(() =>
  import('./modules/kernel/pages/AdminAuditLogPage').then((m) => ({ default: m.AdminAuditLogPage })),
);
const AdminRapportsPage = lazy(() =>
  import('./modules/kernel/pages/AdminRapportsPage').then((m) => ({ default: m.AdminRapportsPage })),
);

const CourrierDetailPage = lazy(() =>
  import('./modules/courrier/pages/CourrierDetailPage').then((m) => ({ default: m.CourrierDetailPage })),
);
const CircuitQueuePage = lazy(() =>
  import('./modules/courrier/pages/CircuitQueuePage').then((m) => ({ default: m.CircuitQueuePage })),
);
const MissionsAssistantsPage = lazy(() =>
  import('./modules/courrier/pages/MissionsAssistantsPage').then((m) => ({ default: m.MissionsAssistantsPage })),
);
const CentreDispatchPage = lazy(() => import('./modules/courrier/pages/CentreDispatchPage').then((m) => ({ default: m.CentreDispatchPage })));
const EnvoisOfficielsPage = lazy(() => import('./modules/courrier/pages/EnvoisOfficielsPage').then((m) => ({ default: m.EnvoisOfficielsPage })));
const ArchivageDossiersPage = lazy(() => import('./modules/courrier/pages/ArchivageDossiersPage').then((m) => ({ default: m.ArchivageDossiersPage })));
const BoiteDispatchDirectionPage = lazy(() => import('./modules/courrier/pages/BoiteDispatchDirectionPage').then((m) => ({ default: m.BoiteDispatchDirectionPage })));
const TraitementsDirectionPage = lazy(() => import('./modules/courrier/pages/TraitementsDirectionPage').then((m) => ({ default: m.TraitementsDirectionPage })));
const DocumentsInternesReceptionPage = lazy(() => import('./modules/courrier/pages/DocumentsInternesReceptionPage').then((m) => ({ default: m.DocumentsInternesReceptionPage })));
const ClassementArchivesPage = lazy(() => import('./modules/courrier/pages/ClassementArchivesPage').then((m) => ({ default: m.ClassementArchivesPage })));
const PosteDeTravailTriPage = lazy(() =>
  import('./modules/courrier/pages/PosteDeTravailTriPage').then((m) => ({ default: m.PosteDeTravailTriPage })),
);
const CourrierCircuitDashboardPage = lazy(() =>
  import('./modules/courrier/pages/CourrierCircuitDashboardPage').then((m) => ({ default: m.CourrierCircuitDashboardPage })),
);
const CourrierDgDashboardPage = lazy(() =>
  import('./modules/courrier/pages/CourrierDgDashboardPage').then((m) => ({ default: m.CourrierDgDashboardPage })),
);
const JustesseTriPage = lazy(() =>
  import('./modules/courrier/pages/JustesseTriPage').then((m) => ({ default: m.JustesseTriPage })),
);
const RattrapageNumerisationPage = lazy(() =>
  import('./modules/courrier/pages/RattrapageNumerisationPage').then((m) => ({ default: m.RattrapageNumerisationPage })),
);
const DirectionDashboardPage = lazy(() =>
  import('./modules/courrier/pages/DirectionDashboardPage').then((m) => ({ default: m.DirectionDashboardPage })),
);
const DirectionCourrierPage = lazy(() =>
  import('./modules/courrier/pages/DirectionCourrierPage').then((m) => ({ default: m.DirectionCourrierPage })),
);
const DirectionStagiairesPage = lazy(() =>
  import('./modules/courrier/pages/DirectionStagiairesPage').then((m) => ({ default: m.DirectionStagiairesPage })),
);

const DfpDashboardPage = lazy(() =>
  import('./modules/stagiaires/pages/DfpDashboardPage').then((m) => ({ default: m.DfpDashboardPage })),
);
const DfpCourrierPage = lazy(() =>
  import('./modules/stagiaires/pages/DfpCourrierPage').then((m) => ({ default: m.DfpCourrierPage })),
);
const StagiairesEnSouffrancePage = lazy(() =>
  import('./modules/stagiaires/pages/StagiairesEnSouffrancePage').then((m) => ({ default: m.StagiairesEnSouffrancePage })),
);
const DfpStagiairesPage = lazy(() =>
  import('./modules/stagiaires/pages/DfpStagiairesPage').then((m) => ({ default: m.DfpStagiairesPage })),
);
const DfpStatistiquesPage = lazy(() =>
  import('./modules/stagiaires/pages/DfpStatistiquesPage').then((m) => ({ default: m.DfpStatistiquesPage })),
);
const DisponibiliteDemandesPage = lazy(() =>
  import('./modules/stagiaires/pages/DisponibiliteDemandesPage').then((m) => ({ default: m.DisponibiliteDemandesPage })),
);
const DemandesStagePage = lazy(() =>
  import('./modules/stagiaires/pages/DemandesStagePage').then((m) => ({ default: m.DemandesStagePage })),
);
const PresencesApercuPage = lazy(() =>
  import('./modules/stagiaires/pages/PresencesApercuPage').then((m) => ({ default: m.PresencesApercuPage })),
);
const StagiaireDetailPage = lazy(() =>
  import('./modules/stagiaires/pages/StagiaireDetailPage').then((m) => ({ default: m.StagiaireDetailPage })),
);
const TableauxRepartitionPage = lazy(() =>
  import('./modules/stagiaires/pages/TableauxRepartitionPage').then((m) => ({ default: m.TableauxRepartitionPage })),
);
const TableauRepartitionDetailPage = lazy(() =>
  import('./modules/stagiaires/pages/TableauRepartitionDetailPage').then((m) => ({ default: m.TableauRepartitionDetailPage })),
);
const HistoriqueStagiairesPage = lazy(() =>
  import('./modules/stagiaires/pages/HistoriqueStagiairesPage').then((m) => ({ default: m.HistoriqueStagiairesPage })),
);
const AdminImportHistoriquePage = lazy(() =>
  import('./modules/stagiaires/pages/AdminImportHistoriquePage').then((m) => ({ default: m.AdminImportHistoriquePage })),
);

const PublicLayout = lazy(() => import('./modules/public/components/PublicLayout').then((m) => ({ default: m.PublicLayout })));
const HomePage = lazy(() => import('./modules/public/pages/HomePage').then((m) => ({ default: m.HomePage })));
const AboutPage = lazy(() => import('./modules/public/pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ServicesPage = lazy(() => import('./modules/public/pages/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const PublicDossierLookupPage = lazy(() =>
  import('./modules/public/pages/PublicDossierLookupPage').then((m) => ({ default: m.PublicDossierLookupPage })),
);
const PublicDemandeStagePage = lazy(() =>
  import('./modules/public/pages/PublicDemandeStagePage').then((m) => ({ default: m.PublicDemandeStagePage })),
);
const CourrierExternePage = lazy(() =>
  import('./modules/public/pages/CourrierExternePage').then((m) => ({ default: m.CourrierExternePage })),
);
const PublicLienPage = lazy(() => import('./modules/public/pages/PublicLienPage').then((m) => ({ default: m.PublicLienPage })));
const CapturePage = lazy(() => import('./modules/public/pages/CapturePage').then((m) => ({ default: m.CapturePage })));
const PublicAttestationVerificationPage = lazy(() =>
  import('./modules/public/pages/PublicAttestationVerificationPage').then((m) => ({
    default: m.PublicAttestationVerificationPage,
  })),
);

/** Redirection d'un ancien chemin renommé, en conservant la query string (ex. ?numero=...). */
function RedirectAvecQuery({ vers }) {
  const location = useLocation();
  return <Navigate to={`${vers}${location.search}`} replace />;
}

function AppRoutes() {
  useThemeSync(useLocation().pathname);

  return (
    <Suspense fallback={<LoadingBlock />}>
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/mot-de-passe-oublie" element={<MotDePasseOubliePage />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ReinitialiserMotDePassePage />} />
        <Route path="/verification-attestation" element={<PublicAttestationVerificationPage />} />
        <Route path="/verification-attestation/:numero" element={<PublicAttestationVerificationPage />} />
        <Route path="/liens/:token" element={<PublicLienPage />} />
        <Route path="/capture/:token" element={<CapturePage />} />

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
            <Route path="/admin/delegations" element={<AdminDelegationsPostePage />} />
            <Route path="/admin/journal-audit" element={<AdminAuditLogPage />} />
            <Route path="/admin/rapports" element={<AdminRapportsPage />} />
            <Route path="/admin/import-historique" element={<AdminImportHistoriquePage />} />
          </Route>

          <Route element={<ProtectedRoute roles={ROLES_DIRECTEUR_DIRECTION} />}>
            <Route path="/direction/tableau-de-bord" element={<DirectionDashboardPage />} />
            <Route path="/direction/stagiaires" element={<DirectionStagiairesPage />} />
          </Route>

          {/* Le secrétariat de direction (Lot 3) reçoit et consulte le
              courrier imputé à sa direction, comme le responsable — mais
              n'a ni tableau de bord stagiaires ni droit d'initier un
              courrier (voir la garde peutEnvoyer dans
              DirectionCourrierWorkspace). */}
          <Route element={<ProtectedRoute roles={[...ROLES_DIRECTEUR_DIRECTION, ROLES.SECRETARIAT_DIRECTION]} />}>
            <Route path="/direction/courrier" element={<DirectionCourrierPage />} />
            <Route path="/direction/courriers-a-traiter" element={<TraitementsDirectionPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={[ROLES.SECRETARIAT_DIRECTION]} />}>
            <Route path="/direction/courriers-recus" element={<BoiteDispatchDirectionPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.AGENT_CIRCUIT_COURRIER]} postesInterdits={['protocole', 'assistant_protocole']} />}>
            <Route path="/circuit/tableau-de-bord" element={<CourrierCircuitDashboardPage />} />
            <Route path="/circuit/:poste" element={<CircuitQueuePage />} />
          </Route>

          {/* Écran de tri (PosteDeTravail) — modèle des huit écrans de
              travail du circuit (voir docs/questions-ont.md) : remplace
              CircuitQueuePage pour le seul Secrétariat 01, un chemin
              statique l'emportant sur ":poste" ci-dessus. */}
          <Route element={<ProtectedRoute roles={[ROLES.AGENT_CIRCUIT_COURRIER]} postes={['secretariat_1']} />}>
            <Route path="/circuit/secretariat_1" element={<PosteDeTravailTriPage />} />
            <Route path="/circuit/instructions-dg" element={<CircuitQueuePage instructionsSeulement />} />
          </Route>
          <Route element={<ProtectedRoute roles={[ROLES.AGENT_CIRCUIT_COURRIER]} postes={['secretariat_2']} />}>
            <Route path="/circuit/centre-dispatch" element={<CentreDispatchPage />} />
            <Route path="/circuit/envois-officiels" element={<EnvoisOfficielsPage />} />
            <Route path="/circuit/archivage-dossiers" element={<ArchivageDossiersPage />} />
            <Route path="/circuit/classement-archives" element={<ClassementArchivesPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.AGENT_CIRCUIT_COURRIER]} postes={['dg']} postesNatifs={['dg']} />}>
            <Route path="/circuit/espace-dg" element={<CourrierDgDashboardPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.AGENT_CIRCUIT_COURRIER]} postes={['assistant_1', 'assistant_2', 'assistant_dga']} />}>
            <Route path="/circuit/missions" element={<MissionsAssistantsPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.AGENT_CIRCUIT_COURRIER]} postes={['secretariat_1']} />}>
            <Route path="/circuit/justesse-tri" element={<JustesseTriPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.AGENT_CIRCUIT_COURRIER]} postes={['reception']} />}>
            <Route path="/circuit/a-numeriser" element={<RattrapageNumerisationPage />} />
            <Route path="/circuit/documents-internes" element={<DocumentsInternesReceptionPage />} />
          </Route>

          <Route element={<ProtectedRoute roles={[ROLES.AGENT_DFP]} />}>
            <Route path="/stagiaires/dashboard" element={<DfpDashboardPage />} />
            <Route path="/stagiaires/courrier" element={<DfpCourrierPage />} />
            <Route path="/stagiaires/actifs" element={<DfpStagiairesPage />} />
            <Route path="/stagiaires/historique" element={<HistoriqueStagiairesPage />} />
            <Route path="/stagiaires/statistiques" element={<DfpStatistiquesPage />} />
            <Route path="/stagiaires/demandes" element={<DemandesStagePage />} />
            <Route path="/stagiaires/presences" element={<PresencesApercuPage />} />
            <Route path="/stagiaires/en-souffrance" element={<StagiairesEnSouffrancePage />} />
            <Route path="/stagiaires/parametres" element={<DisponibiliteDemandesPage />} />
          </Route>

          {/* Lot 4 : DFP (créatrice), Réception et DG/DGA (circuit du
              tableau), administrateur — la précision (qui peut vraiment
              agir) reste dans TableauRepartitionDetailPage, même principe
              que les fiches courrier/stagiaire ci-dessous. */}
          <Route element={<ProtectedRoute roles={[ROLES.AGENT_DFP, ROLES.AGENT_CIRCUIT_COURRIER, ROLES.ADMINISTRATEUR]} postesInterdits={['protocole', 'assistant_protocole']} />}>
            <Route path="/tableaux-repartition" element={<TableauxRepartitionPage />} />
            <Route path="/tableaux-repartition/:id" element={<TableauRepartitionDetailPage />} />
          </Route>

          <Route element={<ProtectedRoute postesInterdits={['protocole', 'assistant_protocole']} />}>
            <Route path="/courriers/:id" element={<CourrierDetailPage />} />
            <Route path="/stagiaires/:id" element={<StagiaireDetailPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/changer-mot-de-passe" element={<ChangerMotDePassePage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
