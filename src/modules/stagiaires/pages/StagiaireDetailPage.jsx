import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStagiaire } from '../api/stagiairesApi';
import { useAuthStore } from '../../kernel/store/authStore';
import { ROLES } from '../../kernel/constants';
import { BadgeReussite } from '../components/BadgeReussite';
import { ObjectifsCard } from '../components/ObjectifsCard';
import { InformationsComplementairesCard } from '../components/InformationsComplementairesCard';
import { DureeStageCard } from '../components/DureeStageCard';
import { ConventionCard } from '../components/ConventionCard';
import { RetourExperienceCard } from '../components/RetourExperienceCard';
import { LiensARelancerCard } from '../components/LiensARelancerCard';
import { ActionsDfp } from '../components/ActionsDfp';
import { ActionsDirection } from '../components/ActionsDirection';
import { PresencesCard } from '../components/PresencesCard';
import { DocumentsCard } from '../components/DocumentsCard';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

export function StagiaireDetailPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);

  const [stagiaire, setStagiaire] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);

  async function charger() {
    setChargement(true);
    try {
      setStagiaire(await getStagiaire(id));
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function executer(action) {
    setErreur(null);
    try {
      const misAJour = await action();
      setStagiaire(misAJour);
      return misAJour;
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'Action impossible.');
      throw err;
    }
  }

  if (chargement) return <LoadingBlock />;
  if (!stagiaire) return <Alert tone="error">Dossier introuvable.</Alert>;

  return (
    <div>
      <PageHeader
        title={stagiaire.nom}
        description={`${stagiaire.etablissement_origine} · Référence ${stagiaire.reference_courrier}`}
        action={<Badge tone="info">{stagiaire.statut_label}</Badge>}
      />

      {erreur && <Alert tone="error" className="mb-6">{erreur}</Alert>}

      {stagiaire.doublon_suspecte && stagiaire.doublon_stagiaire && (
        <Alert tone="error" className="mb-6">
          <strong>Doublon potentiel détecté.</strong> Ce dossier ressemble à celui de{' '}
          <Link to={`/stagiaires/${stagiaire.doublon_stagiaire.id}`} className="underline">
            {stagiaire.doublon_stagiaire.nom} ({stagiaire.doublon_stagiaire.etablissement_origine})
          </Link>{' '}
          — à vérifier avant de poursuivre le traitement.
        </Alert>
      )}

      <div className="mb-6 space-y-6">
        <Card>
          <CardHeader title="Informations" />
          <CardBody className="space-y-2 text-sm text-text-muted">
            <p>
              <span className="font-medium text-text">Type de stage : </span>
              {stagiaire.type_stage_label}
            </p>
            <p>
              <span className="font-medium text-text">Contact : </span>
              {stagiaire.contact}
            </p>
            <p>
              <span className="font-medium text-text">Direction d'accueil : </span>
              {stagiaire.direction?.nom ?? '—'}
              {stagiaire.affecte_hors_quota && (
                <Badge tone="warning" className="ml-2">
                  Affecté hors quota
                </Badge>
              )}
            </p>
            {stagiaire.periode_debut_demandee && (
              <p>
                <span className="font-medium text-text">Période souhaitée (indicative) : </span>
                {stagiaire.periode_debut_demandee} → {stagiaire.periode_fin_demandee}
              </p>
            )}
            <p>
              <span className="font-medium text-text">Stage : </span>
              {stagiaire.date_debut_stage ?? '—'} → {stagiaire.date_fin_stage ?? '—'}
              {stagiaire.jours_restants !== null && stagiaire.date_fin_stage && ` (${stagiaire.jours_restants} jour(s) restant(s))`}
            </p>
            {stagiaire.evaluation?.note_finale != null && (
              <p className="flex items-center gap-2">
                <BadgeReussite />
                <span>
                  <span className="font-medium text-text">Note finale : </span>
                  {stagiaire.evaluation.note_finale} / 100 (direction : {stagiaire.evaluation.direction.total} · DFP :{' '}
                  {stagiaire.evaluation.dfp.total})
                </span>
              </p>
            )}
          </CardBody>
        </Card>

        <ObjectifsCard stagiaire={stagiaire} user={user} executer={executer} />

        <InformationsComplementairesCard stagiaire={stagiaire} user={user} executer={executer} />

        <DureeStageCard stagiaire={stagiaire} user={user} executer={executer} />

        {stagiaire.convention && <ConventionCard stagiaire={stagiaire} user={user} executer={executer} />}

        {user.role === ROLES.AGENT_DFP && stagiaire.statut === 'cloture' && <RetourExperienceCard stagiaireId={stagiaire.id} />}

        {stagiaire.liens_publics?.length > 0 && <LiensARelancerCard liens={stagiaire.liens_publics} />}

        {user.role === ROLES.AGENT_DFP && <ActionsDfp stagiaire={stagiaire} executer={executer} />}
        {user.role === ROLES.RESPONSABLE_DIRECTION && <ActionsDirection stagiaire={stagiaire} executer={executer} />}
      </div>

      {user.role === ROLES.AGENT_DFP && <PresencesCard stagiaire={stagiaire} />}
      <DocumentsCard stagiaire={stagiaire} user={user} />
    </div>
  );
}
