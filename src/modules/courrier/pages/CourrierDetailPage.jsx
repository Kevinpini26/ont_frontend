import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, CalendarDays, Eye, Hash, Route } from 'lucide-react';
import {
  accuserReception,
  dispatcherDirection,
  enregistrer,
  getCourrier,
  imputer,
  transmettreSec1,
  requalifierUrgence,
  rendreAvis,
  renvoyerAuTri,
  renvoyerPourCorrection,
  signer,
  soumettreProjetReponse,
  transmettreAvisDg,
  transmettreDepuisClasseur,
  transmettreTri,
  validerAvantDiffusion,
  validerRelecture,
} from '../api/courrierApi';
import { listAgentsCircuitCourrier } from '../../kernel/api/agentsApi';
import { getDgDisponibilite } from '../../kernel/api/dgDisponibiliteApi';
import { useAuthStore } from '../../kernel/store/authStore';
import { StatutTimeline } from '../components/StatutTimeline';
import { BordereauxTimeline } from '../components/BordereauxTimeline';
import { AnnotationsPanel } from '../components/AnnotationsPanel';
import { NumerisationPanel } from '../components/NumerisationPanel';
import { DossierDocumentsPanel } from '../components/DossierDocumentsPanel';
import { MissionsDocumentairesPanel } from '../components/MissionsDocumentairesPanel';
import { DispatchDecisionPanel } from '../components/DispatchDecisionPanel';
import { classificationAttendue } from '../utils/classification';
import { TipTapEditor } from '../components/TipTapEditor';
import {
  ACTION_PAR_POSTE,
  TYPE_LABELS,
  CLASSIFICATION_LABELS,
  DEGRE_URGENCE_LABELS,
  TONE_URGENCE,
  MENTION_IMPUTATION_LABELS,
  POSTES_ASSISTANTS,
  STATUT_LABELS,
} from '../constants';
import { listDirections } from '../../kernel/api/directionsApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { DocumentPreviewModal } from '../../../shared/components/DocumentPreviewModal';
import { useRequete } from '../../../shared/hooks/useRequete';

export function CourrierDetailPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);

  const { donnees: courrier, setDonnees: setCourrier, chargement } = useRequete((signal) => getCourrier(id, signal), [id]);
  const [erreur, setErreur] = useState(null);
  const [apercu, setApercu] = useState(null);

  async function executer(action) {
    setErreur(null);
    try {
      const misAJour = await action();
      setCourrier(misAJour);
    } catch (err) {
      setErreur(err.response?.data?.message ?? "Action impossible.");
    }
  }

  if (chargement) return <LoadingBlock />;
  if (!courrier) return <Alert tone="error">Courrier introuvable.</Alert>;

  return (
    <div>
      <PageHeader
        title={courrier.objet}
        description={`${courrier.numero_accuse_reception}${
          courrier.numero_enregistrement ? ` · Enregistré sous ${courrier.numero_enregistrement}` : ''
        }${courrier.cote_classement ? ` · Cote ${courrier.cote_classement}` : ''} · ${TYPE_LABELS[courrier.type]}`}
        action={
          <>
            <Badge tone="info">{STATUT_LABELS[courrier.statut] ?? courrier.statut}</Badge>
            {courrier.mode_reception === 'depot_en_ligne' && !courrier.numero_enregistrement && (
              <Badge tone="warning">À enregistrer</Badge>
            )}
            {courrier.pdf_disponible && (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setApercu({
                  title: 'Courrier signé',
                  url: `/courriers/${courrier.id}/pdf`,
                  downloadFilename: `courrier-${courrier.numero_accuse_reception}.pdf`,
                })
              }
            >
              <Eye size={18} />
              Voir le PDF signé
            </Button>
            )}
          </>
        }
      />

      {courrier.initie_par_dg && (
        <div className="mb-4">
          <Badge tone="info">Courrier initié par la DG</Badge>
        </div>
      )}

      <div className="mb-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <StatutTimeline
            statut={courrier.statut}
            necessiteAvisDg={courrier.necessite_avis_dg}
            initieParDg={courrier.initie_par_dg}
            validationDgRequise={courrier.validation_dg_requise}
            transitions={courrier.transitions}
          />
        </div>
        <Card className="xl:sticky xl:top-[88px]">
          <CardHeader title="Repères du dossier" />
          <CardBody>
            <dl className="space-y-4 text-sm">
              <div className="flex gap-3"><Hash size={17} className="mt-0.5 shrink-0 text-ont-blue-600" /><div><dt className="text-xs text-text-subtle">Référence</dt><dd className="mt-0.5 font-semibold text-text">{courrier.reference_documentaire ?? courrier.numero_accuse_reception}</dd></div></div>
              <div className="flex gap-3"><Building2 size={17} className="mt-0.5 shrink-0 text-ont-blue-600" /><div><dt className="text-xs text-text-subtle">Destination</dt><dd className="mt-0.5 font-medium text-text">{courrier.direction_destination?.nom ?? 'Direction Générale'}</dd></div></div>
              <div className="flex gap-3"><Route size={17} className="mt-0.5 shrink-0 text-ont-blue-600" /><div><dt className="text-xs text-text-subtle">Cycle décisionnel</dt><dd className="mt-0.5 font-medium text-text">Cycle {courrier.cycle_courant ?? courrier.tour ?? 1}</dd></div></div>
              <div className="flex gap-3"><CalendarDays size={17} className="mt-0.5 shrink-0 text-ont-blue-600" /><div><dt className="text-xs text-text-subtle">Dernière activité</dt><dd className="mt-0.5 font-medium text-text">{courrier.updated_at ? new Date(courrier.updated_at).toLocaleString('fr-FR') : '—'}</dd></div></div>
            </dl>
          </CardBody>
        </Card>
      </div>

      <div className="mb-5">
        <BordereauxTimeline transitions={courrier.transitions} />
      </div>

      <div className="mb-5">
        <MissionsDocumentairesPanel courrier={courrier} user={user} onUpdate={setCourrier} />
      </div>

      {erreur && <Alert tone="error" className="mb-6">{erreur}</Alert>}

      <div className="mb-5 space-y-5">
        <Card>
          <CardHeader title="Informations" />
          <CardBody className="space-y-3 text-sm">
            <p className="text-text-muted">
              <span className="font-medium text-text">Origine : </span>
              {courrier.direction_origine?.nom ?? '—'}
              <br />
              <span className="font-medium text-text">Destination : </span>
              {courrier.direction_destination?.nom ?? 'Direction Générale'}
            </p>
            {(courrier.mode_reception === 'depot_en_ligne' || courrier.numero_enregistrement || courrier.reference_documentaire || courrier.numero_depart) && (
              <dl className="grid gap-2 rounded-field border border-border p-3 sm:grid-cols-3">
                {courrier.mode_reception === 'depot_en_ligne' && !courrier.numero_enregistrement ? (
                  <div>
                    <dt className="text-xs text-text-subtle">Numéro d’enregistrement</dt>
                    <dd className="font-medium text-warning">Non enregistré</dd>
                  </div>
                ) : courrier.numero_enregistrement && (
                  <div>
                    <dt className="text-xs text-text-subtle">Numéro d’enregistrement</dt>
                    <dd className="font-medium text-text">{courrier.numero_enregistrement}</dd>
                  </div>
                )}
                {courrier.reference_documentaire && (
                  <div>
                    <dt className="text-xs text-text-subtle">Référence documentaire</dt>
                    <dd className="font-medium text-text">{courrier.reference_documentaire}</dd>
                  </div>
                )}
                {courrier.numero_depart && (
                  <div>
                    <dt className="text-xs text-text-subtle">Numéro de départ</dt>
                    <dd className="font-medium text-text">{courrier.numero_depart}</dd>
                  </div>
                )}
              </dl>
            )}
            {courrier.tour > 1 && (
              <Alert tone="warning">
                Ce dossier boucle : {courrier.tour}ᵉ passage devant la Direction Générale.
              </Alert>
            )}
            <PanneauUrgence courrier={courrier} user={user} executer={executer} />
            <PanneauImputation courrier={courrier} user={user} executer={executer} />
            {courrier.avis_dg && (
              <p className="text-text-muted">
                <span className="font-medium text-text">Avis DG : </span>
                {courrier.avis_dg}
                {courrier.avis_dg_rendu_par && ` — rendu par ${courrier.avis_dg_rendu_par}`}
                {courrier.avis_dg_rendu_en_interim && (
                  <Badge tone="warning" className="ml-2">
                    Traité par le DGA en intérim de la DG
                  </Badge>
                )}
              </p>
            )}
            {courrier.piece_jointe_disponible && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setApercu({
                    title: 'Pièce jointe',
                    url: `/courriers/${courrier.id}/piece-jointe`,
                    downloadFilename: `piece-jointe-${courrier.numero_accuse_reception}`,
                  })
                }
              >
                <Eye size={16} />
                Pièce jointe
              </Button>
            )}
            {courrier.candidat && courrier.anonymise_at ? (
              <div className="rounded-field bg-surface-sunken p-3 text-sm">
                <p className="font-medium text-text-muted">Candidature non retenue — dossier anonymisé</p>
                <p className="mt-1 text-xs text-text-subtle">
                  Les données personnelles du candidat ont été supprimées conformément à la politique de conservation
                  (12 mois après l'avis défavorable de la Direction Générale).
                </p>
              </div>
            ) : (
              courrier.candidat && (
                <div className="rounded-card bg-ont-gold-50 p-3 text-sm dark:bg-ont-gold-900/20">
                  <p className="mb-1 font-medium text-ont-gold-800 dark:text-ont-gold-300">
                    Candidat (demande de stage{courrier.candidat.type_stage_label ? ` — ${courrier.candidat.type_stage_label}` : ''})
                  </p>
                  <p className="text-text-muted">
                    {courrier.candidat.nom} — {courrier.candidat.contact}
                    <br />
                    {courrier.candidat.etablissement}
                    {courrier.candidat.periode_souhaitee_debut && (
                      <>
                        <br />
                        Période souhaitée par le candidat (indicative) : {courrier.candidat.periode_souhaitee_debut} →{' '}
                        {courrier.candidat.periode_souhaitee_fin}
                      </>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {courrier.candidat.lettre_stage_disponible && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setApercu({
                            title: "Lettre de stage de l'université",
                            url: `/courriers/${courrier.id}/lettre-stage`,
                            downloadFilename: `lettre-stage-${courrier.numero_accuse_reception}`,
                          })
                        }
                      >
                        <Eye size={16} />
                        Lettre de stage de l'université
                      </Button>
                    )}
                    {courrier.candidat.lettre_demande_disponible && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setApercu({
                            title: 'Lettre de demande de stage',
                            url: `/courriers/${courrier.id}/pieces/lettre-demande`,
                            downloadFilename: `lettre-demande-${courrier.numero_accuse_reception}`,
                          })
                        }
                      >
                        <Eye size={16} />
                        Lettre de demande de stage
                      </Button>
                    )}
                    {courrier.candidat.cv_disponible && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setApercu({
                            title: 'CV du candidat',
                            url: `/courriers/${courrier.id}/pieces/cv`,
                            downloadFilename: `cv-${courrier.numero_accuse_reception}`,
                          })
                        }
                      >
                        <Eye size={16} />
                        CV du candidat
                      </Button>
                    )}
                    {courrier.candidat.diplome_etat_disponible && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setApercu({
                            title: "Diplôme d'État",
                            url: `/courriers/${courrier.id}/pieces/diplome-etat`,
                            downloadFilename: `diplome-etat-${courrier.numero_accuse_reception}`,
                          })
                        }
                      >
                        <Eye size={16} />
                        Diplôme d'État
                      </Button>
                    )}
                    {courrier.candidat.dernier_diplome_disponible && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          setApercu({
                            title: 'Dernier diplôme obtenu',
                            url: `/courriers/${courrier.id}/pieces/dernier-diplome`,
                            downloadFilename: `dernier-diplome-${courrier.numero_accuse_reception}`,
                          })
                        }
                      >
                        <Eye size={16} />
                        Dernier diplôme obtenu
                      </Button>
                    )}
                  </div>
                </div>
              )
            )}
            {courrier.expediteur_externe_nom && (
              <div className="rounded-card bg-ont-blue-50 p-3 text-sm dark:bg-ont-blue-900/20">
                <p className="mb-1 font-medium text-ont-blue-800 dark:text-ont-blue-300">Expéditeur externe</p>
                <p className="text-text-muted">
                  {courrier.expediteur_externe_nom}
                  {courrier.expediteur_externe_email && <> — {courrier.expediteur_externe_email}</>}
                  {courrier.expediteur_externe_telephone && <> — {courrier.expediteur_externe_telephone}</>}
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        <NumerisationPanel courrier={courrier} />
        <DossierDocumentsPanel courrier={courrier} />
        <DispatchDecisionPanel courrier={courrier} user={user} onUpdate={setCourrier} />
        {courrier.classement && <Card><CardHeader title="Classement"/><CardBody className="grid gap-2 text-sm md:grid-cols-2"><p>Statut : {courrier.classement.statut_label}</p><p>Cote : {courrier.classement.cote || 'Non renseignée'}</p><p>Emplacement : {courrier.classement.emplacement}</p><p>Classé par : {courrier.classement.classe_par} · {new Date(courrier.classement.classe_at).toLocaleString('fr-FR')}</p>{courrier.classement.archive_at&&<p>Archivé par : {courrier.classement.archive_par} · {new Date(courrier.classement.archive_at).toLocaleString('fr-FR')}</p>}</CardBody></Card>}

        {courrier.contenu && (
          <Card>
            <CardHeader title="Contenu du courrier" />
            <CardBody>
              <TipTapEditor content={courrier.contenu} editable={false} />
            </CardBody>
          </Card>
        )}

        <ActionsCourrier courrier={courrier} user={user} executer={executer} />

        {courrier.projet_reponse_contenu && (
          <Card>
            <CardHeader title="Projet de réponse" />
            <CardBody>
              <TipTapEditor content={courrier.projet_reponse_contenu} editable={false} />
            </CardBody>
          </Card>
        )}
      </div>

      <AnnotationsPanel courrierId={courrier.id} />

      <DocumentPreviewModal
        open={apercu !== null}
        onClose={() => setApercu(null)}
        title={apercu?.title ?? ''}
        url={apercu?.url}
        downloadFilename={apercu?.downloadFilename}
      />
    </div>
  );
}

/**
 * Toujours visible dans les Informations (pas seulement dans ActionsCourrier,
 * qui ne montre qu'une action à la fois selon le statut) : le degré
 * d'urgence et la correction DG doivent rester accessibles quel que soit le
 * statut courant, une fois le tri effectué — voir
 * CourrierCircuitService::requalifierUrgence().
 */
function PanneauUrgence({ courrier, user, executer }) {
  const [nouveauDegre, setNouveauDegre] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // urgence_triee_at fait foi, pas degre_urgence seul : un degré pré-rempli
  // à la création (Réception) ne vaut pas tri officiel — voir
  // Courrier::urgenceTriee() côté backend.
  if (!courrier.urgence_triee_at) return null;

  async function requalifier(e) {
    e.preventDefault();
    setEnvoiEnCours(true);
    try {
      await executer(() => requalifierUrgence(courrier.id, nouveauDegre));
      setNouveauDegre('');
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-medium text-text">Degré d'urgence : </span>
      <Badge tone={TONE_URGENCE[courrier.degre_urgence]}>{DEGRE_URGENCE_LABELS[courrier.degre_urgence]}</Badge>
      {user.poste === 'dg' && (
        <form onSubmit={requalifier} className="flex items-center gap-2">
          <select
            className={`${inputClass} w-auto`}
            value={nouveauDegre}
            onChange={(e) => setNouveauDegre(e.target.value)}
          >
            <option value="" disabled>
              Corriger…
            </option>
            {Object.entries(DEGRE_URGENCE_LABELS)
              .filter(([valeur]) => valeur !== courrier.degre_urgence)
              .map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
          </select>
          <Button type="submit" size="sm" variant="secondary" disabled={!nouveauDegre || envoiEnCours}>
            Corriger
          </Button>
        </form>
      )}
    </div>
  );
}

/**
 * Lot 3 : l'imputation (direction principale + mention) route le courrier
 * sans jamais clore le circuit — voir CourrierPolicy::imputer(), ouverte à
 * tout poste du circuit central, pas seulement la DG (question ouverte,
 * voir docs/questions-ont.md). Toujours visible, pas seulement à
 * en_attente_avis_dg : imputer() n'est pas gardé par statut côté backend.
 * Une seule direction principale ici (pas de copies) : suffit à déclencher
 * le dispatch (Lot 3), une gestion complète des copies reste à ajouter si
 * le besoin se confirme.
 */
function PanneauImputation({ courrier, user, executer }) {
  const [directions, setDirections] = useState([]);
  const [directionId, setDirectionId] = useState('');
  const [mention, setMention] = useState('pour_attribution');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const peutImputer = user.role === 'agent_circuit_courrier' || user.role === 'administrateur';

  useEffect(() => {
    if (peutImputer) {
      listDirections().then(setDirections);
    }
  }, [peutImputer]);

  if (!peutImputer) return null;

  const principale = courrier.imputations?.find((i) => i.est_principale);

  async function soumettre(e) {
    e.preventDefault();
    setEnvoiEnCours(true);
    try {
      await executer(() => imputer(courrier.id, directionId, mention));
      setDirectionId('');
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-medium text-text">Imputation : </span>
      {principale ? (
        <Badge tone="info">
          {principale.direction?.nom} — {principale.mention_label}
        </Badge>
      ) : (
        <span className="text-text-subtle">Aucune</span>
      )}
      <form onSubmit={soumettre} className="flex flex-wrap items-center gap-2">
        <select className={`${inputClass} w-auto`} value={directionId} onChange={(e) => setDirectionId(e.target.value)}>
          <option value="" disabled>
            Direction…
          </option>
          {directions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} — {d.nom}
            </option>
          ))}
        </select>
        <select className={`${inputClass} w-auto`} value={mention} onChange={(e) => setMention(e.target.value)}>
          {Object.entries(MENTION_IMPUTATION_LABELS).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary" disabled={!directionId || envoiEnCours}>
          {principale ? 'Remplacer' : 'Imputer'}
        </Button>
      </form>
    </div>
  );
}

function ActionsCourrier({ courrier, user, executer }) {
  const [agents, setAgents] = useState([]);
  const [relecteurId, setRelecteurId] = useState('');
  const [projetContenu, setProjetContenu] = useState(courrier.projet_reponse_contenu ?? '');
  const [avisDg, setAvisDg] = useState('favorable');
  const [avisCommentaire, setAvisCommentaire] = useState('');
  const [motifReorientation, setMotifReorientation] = useState('');
  const [degreUrgenceTri, setDegreUrgenceTri] = useState('normal');
  const [instructionTransmission, setInstructionTransmission] = useState('');
  const [relectureCommentaire, setRelectureCommentaire] = useState('');
  const [observationCorrection, setObservationCorrection] = useState('');
  const [noteTechnique, setNoteTechnique] = useState('');
  const [accuseReceptionPartenaire, setAccuseReceptionPartenaire] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [dgIndisponible, setDgIndisponible] = useState(false);

  useEffect(() => {
    if (courrier.sens !== 'sortant' && courrier.statut === 'projet_a_rediger' && POSTES_ASSISTANTS.includes(user.poste)) {
      listAgentsCircuitCourrier().then(setAgents);
    }
  }, [courrier.sens, courrier.statut, user.poste]);

  useEffect(() => {
    if (courrier.statut === 'en_attente_avis_dg' && user.poste === 'dga') {
      getDgDisponibilite().then((disponible) => setDgIndisponible(!disponible));
    }
  }, [courrier.statut, user.poste]);

  const estRelecteurDesigne = courrier.relecteur?.id === user.id;

  // Le classement interne/externe n'est jamais un choix libre de l'agent —
  // déterminé côté serveur par la nature du courrier et rejeté s'il ne
  // correspond pas (voir classificationAttendue()).
  const classification = classificationAttendue(courrier);
  const estDepotPublicRecu = courrier.statut === 'recu' && courrier.mode_reception === 'depot_en_ligne';

  async function executerEtSuivre(action) {
    setEnvoiEnCours(true);
    try {
      await executer(action);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (estDepotPublicRecu && user.poste === 'reception' && !courrier.numero_enregistrement) {
    return (
      <Card>
        <CardHeader title="Enregistrer le dépôt" description="Attribuez le numéro institutionnel avant toute transmission à SEC1." />
        <CardBody className="space-y-4">
          <Field label="Classification">
            <Badge tone="warning">{CLASSIFICATION_LABELS[classification]}</Badge>
          </Field>
          <Field label="Accusé de réception du partenaire" htmlFor="accuseReceptionPartenaireDepot">
            <input
              id="accuseReceptionPartenaireDepot"
              className={inputClass}
              value={accuseReceptionPartenaire}
              onChange={(e) => setAccuseReceptionPartenaire(e.target.value)}
            />
          </Field>
          <Button
            disabled={envoiEnCours || !accuseReceptionPartenaire.trim()}
            onClick={() => executerEtSuivre(() => enregistrer(courrier.id, classification, noteTechnique, accuseReceptionPartenaire))}
          >
            Enregistrer
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (estDepotPublicRecu && user.poste === 'reception' && courrier.numero_enregistrement) {
    return (
      <Card>
        <CardHeader title="Transmettre à SEC1" description={`Dépôt enregistré sous ${courrier.numero_enregistrement}. Il peut maintenant entrer dans le circuit administratif.`} />
        <CardBody className="space-y-4">
          <Field label="Instruction de transmission" htmlFor="instructionTransmissionInitiale">
            <textarea id="instructionTransmissionInitiale" className={inputClass} maxLength={2000} value={instructionTransmission} onChange={(e) => setInstructionTransmission(e.target.value)} />
          </Field>
          <Button disabled={envoiEnCours} onClick={() => executerEtSuivre(() => transmettreSec1(courrier.id, instructionTransmission))}>
            Transmettre à SEC1
          </Button>
        </CardBody>
      </Card>
    );
  }

  // Tant que le bordereau qui a amené ce dossier à son statut actuel n'est
  // pas acquitté, aucune des actions ci-dessous n'est accessible — voir
  // CourrierCircuitService::assertDechargeDonnee(). en_relecture/projet_a_valider
  // sont un cas particulier : le destinataire est le relecteur désigné
  // précisément, jamais un poste (contrairement à ACTION_PAR_POSTE, qui liste
  // aussi la DG pour ces statuts — pour la signature, une fois la relecture
  // validée, pas pour la décharge elle-même).
  if (courrier.en_transit) {
    // reception a une entrée non-tableau ({ statutDepart: null }, jamais
    // habilitée à une transition) — Array.isArray exclut ce cas plutôt que
    // de planter sur .some().
    const actionsDuPoste = ACTION_PAR_POSTE[user.poste];
    const eligiblePourDecharge =
      courrier.statut === 'en_relecture' || courrier.statut === 'projet_a_valider'
        ? estRelecteurDesigne
        : Array.isArray(actionsDuPoste) && actionsDuPoste.some((a) => a.statutDepart === courrier.statut);

    if (eligiblePourDecharge) {
      return (
        <Card>
          <CardHeader title="Confirmer la réception" description="Ce dossier vous a été transmis et attend votre décharge avant que vous puissiez agir dessus." />
          <CardBody>
            <Button disabled={envoiEnCours} onClick={() => executerEtSuivre(() => accuserReception(courrier.id))}>
              Confirmer la réception
            </Button>
          </CardBody>
        </Card>
      );
    }

    return (
      <Card>
        <CardBody>
          <Alert tone="warning">Ce dossier est en transit — il est en attente de décharge par son destinataire.</Alert>
        </CardBody>
      </Card>
    );
  }

  if (courrier.statut === 'recu' && courrier.necessite_avis_dg && user.poste === 'secretariat_1') {
    return (
      <Card>
        <CardBody>
          <Button disabled={envoiEnCours} onClick={() => executerEtSuivre(() => transmettreTri(courrier.id))}>
            Transmettre au tri
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (courrier.statut === 'en_attente_tri' && user.poste === 'secretariat_1') {
    return (
      <Card>
        <CardHeader
          title="Trier par degré d'urgence"
          description="Un degré urgent ou très urgent part directement à la Direction Générale ; un degré normal reste tenu au classeur d'attente, à transmettre vous-même quand vous le jugerez bon."
        />
        <CardBody className="space-y-4">
          <Field label="Degré d'urgence" htmlFor="degreUrgenceTri">
            <select id="degreUrgenceTri" className={inputClass} value={degreUrgenceTri} onChange={(e) => setDegreUrgenceTri(e.target.value)}>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="tres_urgent">Très urgent</option>
            </select>
          </Field>
          <Button disabled={envoiEnCours} onClick={() => executerEtSuivre(() => transmettreAvisDg(courrier.id, degreUrgenceTri))}>
            Trier
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (courrier.statut === 'en_attente_classeur' && user.poste === 'secretariat_1') {
    return (
      <Card>
        <CardHeader
          title="Au classeur d'attente"
          description="Ce dossier n'est pas urgent — il n'a jamais quitté votre bureau. Transmettez-le à la Direction Générale quand vous le jugerez bon."
        />
        <CardBody>
          <Button disabled={envoiEnCours} onClick={() => executerEtSuivre(() => transmettreDepuisClasseur(courrier.id))}>
            Transmettre à la DG
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (courrier.statut === 'retour_reception' && user.poste === 'reception') {
    return (
      <Card>
        <CardHeader title="Transmettre à SEC1" description="Ce dossier revient d'un avis réservé. La Réception le remet à SEC1 pour un nouveau tri avant toute présentation à la DG." />
        <CardBody className="space-y-4">
          <Field label="Instruction de transmission" htmlFor="instructionTransmission">
            <textarea id="instructionTransmission" className={inputClass} maxLength={2000} value={instructionTransmission} onChange={(e) => setInstructionTransmission(e.target.value)} />
          </Field>
          <Button disabled={envoiEnCours} onClick={() => executerEtSuivre(() => transmettreSec1(courrier.id, instructionTransmission))}>
            Transmettre à SEC1
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (courrier.statut === 'en_dispatch' && user.poste === 'secretariat_2') {
    return (
      <Card>
        <CardHeader
          title="Transmettre au secrétariat de la direction"
          description="Avis DG favorable sur un courrier imputé — transmettez-le au secrétariat de la direction destinataire principale."
        />
        <CardBody>
          <Button disabled={envoiEnCours} onClick={() => executerEtSuivre(() => dispatcherDirection(courrier.id))}>
            Transmettre à la direction
          </Button>
        </CardBody>
      </Card>
    );
  }

  // La DG rend l'avis normalement ; la DGA ne le peut que si la DG est
  // marquée indisponible (intérim, voir GET /dg-disponibilite) — sinon la
  // DGA ne voit aucune action ici, cohérent avec le blocage 422 côté serveur.
  if (courrier.statut === 'en_attente_avis_dg' && (user.poste === 'dg' || (user.poste === 'dga' && dgIndisponible))) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader title="Rendre un avis" />
          <CardBody className="space-y-4">
            {user.poste === 'dga' && (
              <Alert tone="info">Vous intervenez en intérim de la DG, actuellement marquée indisponible.</Alert>
            )}
            <Field label="Avis" htmlFor="avis">
              <select id="avis" className={inputClass} value={avisDg} onChange={(e) => setAvisDg(e.target.value)}>
                <option value="favorable">Favorable</option>
                <option value="defavorable">Défavorable</option>
                <option value="reserve">Réservé</option>
              </select>
            </Field>
            <Field
              label="Commentaire"
              htmlFor="avisCommentaire"
              required={avisDg === 'reserve'}
              hint={avisDg === 'reserve' ? "Un avis réservé doit préciser ce qui est attendu pour que le dossier puisse revenir complet." : undefined}
            >
              <textarea id="avisCommentaire" rows={3} className={inputClass} value={avisCommentaire} onChange={(e) => setAvisCommentaire(e.target.value)} />
            </Field>
            <Button
              disabled={envoiEnCours || (avisDg === 'reserve' && !avisCommentaire.trim())}
              onClick={() => executerEtSuivre(() => rendreAvis(courrier.id, avisDg, avisCommentaire))}
            >
              Valider l'avis
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Renvoyer au tri"
            description="Ce dossier n'aurait jamais dû vous être présenté (mauvaise orientation) — renvoyez-le au Secrétariat 01 sans que ce soit une faute : le tour n'est pas incrémenté."
          />
          <CardBody className="space-y-4">
            <Field label="Motif (facultatif)" htmlFor="motifReorientation">
              <textarea
                id="motifReorientation"
                rows={2}
                className={inputClass}
                value={motifReorientation}
                onChange={(e) => setMotifReorientation(e.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              disabled={envoiEnCours}
              onClick={() => executerEtSuivre(() => renvoyerAuTri(courrier.id, motifReorientation || null))}
            >
              Renvoyer au tri
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (courrier.statut === 'en_attente_validation_dg' && user.poste === 'dg') {
    return (
      <Card>
        <CardHeader title="Valider avant diffusion" description="Ce courrier a été initié en votre nom et attend votre aval avant de partir en relecture." />
        <CardBody className="space-y-4">
          <TipTapEditor content={courrier.projet_reponse_contenu} editable={false} />
          <Button disabled={envoiEnCours} onClick={() => executerEtSuivre(() => validerAvantDiffusion(courrier.id))}>
            Valider avant diffusion
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (courrier.sens !== 'sortant' && courrier.statut === 'projet_a_rediger' && POSTES_ASSISTANTS.includes(user.poste)) {
    return (
      <Card>
        <CardHeader title="Rédiger le projet de réponse" />
        <CardBody className="space-y-4">
          {courrier.projet_renvoi_observation && (
            <Alert tone="warning">
              Renvoyé pour correction par {courrier.projet_renvoye_par ?? 'le relecteur'} : {courrier.projet_renvoi_observation}
            </Alert>
          )}
          <TipTapEditor content={projetContenu} onChange={setProjetContenu} />
          <Field label="Relecteur désigné" htmlFor="relecteur">
            <select id="relecteur" className={inputClass} value={relecteurId} onChange={(e) => setRelecteurId(e.target.value)}>
              <option value="" disabled>
                Choisir un relecteur
              </option>
              {agents
                .filter((a) => a.id !== user.id)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.poste_label})
                  </option>
                ))}
            </select>
          </Field>
          <Button
            disabled={!relecteurId || envoiEnCours}
            onClick={() => executerEtSuivre(() => soumettreProjetReponse(courrier.id, projetContenu, Number(relecteurId)))}
          >
            Soumettre à la relecture
          </Button>
        </CardBody>
      </Card>
    );
  }

  if ((courrier.statut === 'en_relecture' || courrier.statut === 'projet_a_valider') && estRelecteurDesigne && !courrier.relecture_validee_at) {
    // Le renvoi pour correction (lot assistants) n'existe que pour
    // projet_a_valider — en_relecture (dg_initie/sortant) n'a pas
    // d'assistant rédacteur à qui renvoyer, voir CourrierPolicy::renvoyerPourCorrection().
    const peutRenvoyerPourCorrection = courrier.statut === 'projet_a_valider';

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader title="Validation de la relecture" />
          <CardBody className="space-y-4">
            <Field label="Commentaire (optionnel)" htmlFor="relectureCommentaire">
              <textarea
                id="relectureCommentaire"
                rows={3}
                className={inputClass}
                value={relectureCommentaire}
                onChange={(e) => setRelectureCommentaire(e.target.value)}
              />
            </Field>
            <Button disabled={envoiEnCours} onClick={() => executerEtSuivre(() => validerRelecture(courrier.id, relectureCommentaire))}>
              Valider la relecture
            </Button>
          </CardBody>
        </Card>

        {peutRenvoyerPourCorrection && (
          <Card>
            <CardHeader
              title="Renvoyer pour correction"
              description="L'observation est obligatoire : l'assistant rédacteur doit savoir précisément ce qui ne va pas."
            />
            <CardBody className="space-y-4">
              <Field label="Observation" htmlFor="observationCorrection" required>
                <textarea
                  id="observationCorrection"
                  rows={3}
                  className={inputClass}
                  value={observationCorrection}
                  onChange={(e) => setObservationCorrection(e.target.value)}
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                disabled={envoiEnCours || !observationCorrection.trim()}
                onClick={() => executerEtSuivre(() => renvoyerPourCorrection(courrier.id, observationCorrection))}
              >
                Renvoyer pour correction
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  if ((courrier.statut === 'en_relecture' || courrier.statut === 'projet_a_valider') && user.poste === 'dg') {
    return (
      <Card>
        <CardBody className="space-y-4">
          {!courrier.relecture_validee_at && (
            <Alert tone="error">La relecture n'a pas encore été validée par le relecteur désigné : la signature sera refusée.</Alert>
          )}
          <Button variant="gold" disabled={envoiEnCours} onClick={() => executerEtSuivre(() => signer(courrier.id))}>
            Signer
          </Button>
        </CardBody>
      </Card>
    );
  }

  const attendEnregistrementDirect = courrier.statut === 'recu' && !courrier.necessite_avis_dg;

  if ((courrier.statut === 'signe' || attendEnregistrementDirect) && user.poste === 'secretariat_2') {
    return (
      <Card>
        <CardHeader
          title="Enregistrement final"
          description={attendEnregistrementDirect ? 'Circuit court — enregistrement direct, sans avis DG.' : undefined}
        />
        <CardBody className="space-y-4">
          <Field label="Classification" hint="Déterminée automatiquement d'après la nature du courrier — non modifiable.">
            <Badge tone={classification === 'externe' ? 'warning' : 'info'}>{CLASSIFICATION_LABELS[classification]}</Badge>
          </Field>
          {classification === 'interne' ? (
            <Field label="Note technique" htmlFor="noteTechnique">
              <textarea id="noteTechnique" rows={3} className={inputClass} value={noteTechnique} onChange={(e) => setNoteTechnique(e.target.value)} />
            </Field>
          ) : (
            <Field label="Accusé de réception du partenaire" htmlFor="accuseReceptionPartenaire">
              <input
                id="accuseReceptionPartenaire"
                className={inputClass}
                value={accuseReceptionPartenaire}
                onChange={(e) => setAccuseReceptionPartenaire(e.target.value)}
              />
            </Field>
          )}
          <Button
            disabled={envoiEnCours}
            onClick={() => executerEtSuivre(() => enregistrer(courrier.id, classification, noteTechnique, accuseReceptionPartenaire))}
          >
            Enregistrer
          </Button>
        </CardBody>
      </Card>
    );
  }

  return null;
}
