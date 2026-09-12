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
import { NotificationsDiffusionCard } from '../components/NotificationsDiffusionCard';
import { ActionsDfp } from '../components/ActionsDfp';
import { ActionsDirection } from '../components/ActionsDirection';
import { PresencesCard } from '../components/PresencesCard';
import { DocumentsCard } from '../components/DocumentsCard';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

function initialesDe(nom) {
  return nom
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0])
    .join('')
    .toUpperCase();
}

/**
 * Bandeau d'en-tête — remplace PageHeader sur cet écran précis : identité
 * (initiales, faute de photo dans le modèle), statut, direction d'accueil,
 * et une barre de progression du stage (proportion écoulée entre début et
 * fin) quand les deux dates sont connues. La progression est bornée à
 * [0, 100] : un stage pas encore commencé ou déjà dépassé de sa date de fin
 * (clôture tardive) ne doit jamais donner une barre négative ou débordante.
 */
function BandeauStagiaire({ stagiaire }) {
  const debut = stagiaire.date_debut_stage ? new Date(stagiaire.date_debut_stage) : null;
  const fin = stagiaire.date_fin_stage ? new Date(stagiaire.date_fin_stage) : null;
  const progression =
    debut && fin && fin > debut ? Math.min(100, Math.max(0, Math.round(((Date.now() - debut.getTime()) / (fin - debut)) * 100))) : null;

  return (
    <div className="mb-6 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ont-blue-700 text-lg font-semibold text-white">
          {initialesDe(stagiaire.nom)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-semibold text-text">{stagiaire.nom}</h1>
            <Badge tone="info">{stagiaire.statut_label}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-subtle">
            {stagiaire.direction?.nom ?? 'Direction non affectée'} · {stagiaire.etablissement_origine} · Référence{' '}
            {stagiaire.reference_courrier}
          </p>

          {progression !== null && (
            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between text-xs text-text-subtle">
                <span>{stagiaire.date_debut_stage}</span>
                <span>{stagiaire.date_fin_stage}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={progression} aria-valuemin={0} aria-valuemax={100} aria-label="Progression du stage">
                <div className="h-full rounded-full bg-ont-blue-600 transition-[width]" style={{ width: `${progression}%` }} />
              </div>
              {stagiaire.jours_restants !== null && (
                <p className="mt-1 text-xs text-text-subtle">{stagiaire.jours_restants} jour(s) restant(s)</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
      <BandeauStagiaire stagiaire={stagiaire} />

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

      {/* Deux colonnes en desktop : identité/parcours/documents à gauche
          (contenu à lire), actions et état courant à droite (ce qu'on vient
          faire sur cet écran) — empilées en une seule colonne sur mobile. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
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
              {stagiaire.statut === 'non_retenu' && (
                <p>
                  <span className="font-medium text-text">Motif du refus : </span>
                  {stagiaire.motif_non_retenu_label}
                  {stagiaire.motif_non_retenu_libre ? ` — ${stagiaire.motif_non_retenu_libre}` : ''}
                </p>
              )}
              {stagiaire.evaluation?.note_finale != null && (
                <p className="flex items-center gap-3">
                  <BadgeReussite noteFinale={stagiaire.evaluation.note_finale} className="h-20 w-20 shrink-0" />
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

          {stagiaire.convention && <ConventionCard stagiaire={stagiaire} user={user} executer={executer} />}

          {user.role === ROLES.AGENT_DFP && stagiaire.statut === 'cloture' && <RetourExperienceCard stagiaireId={stagiaire.id} />}

          <DocumentsCard stagiaire={stagiaire} user={user} />
        </div>

        <div className="space-y-6">
          {user.role === ROLES.AGENT_DFP && <ActionsDfp stagiaire={stagiaire} executer={executer} />}
          {user.role === ROLES.RESPONSABLE_DIRECTION && <ActionsDirection stagiaire={stagiaire} executer={executer} />}

          <DureeStageCard stagiaire={stagiaire} user={user} executer={executer} />

          {stagiaire.liens_publics?.length > 0 && <LiensARelancerCard liens={stagiaire.liens_publics} />}

          {user.role === ROLES.AGENT_DFP && <PresencesCard stagiaire={stagiaire} />}

          {user.role === ROLES.AGENT_DFP && ['affecte', 'stage_en_cours', 'evaluation_en_cours', 'cloture', 'non_retenu'].includes(stagiaire.statut) && (
            <NotificationsDiffusionCard stagiaireId={stagiaire.id} />
          )}
        </div>
      </div>
    </div>
  );
}
