import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { demanderCorrectionDocumentProduit, getDocumentInterneAutonome, validerDocumentProduit } from '../api/courrierApi';
import { TipTapEditor } from '../components/TipTapEditor';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { formaterDateHeure } from '../utils/dateHeure';

const STATUTS_DECISION = ['soumis_directeur'];
const MESSAGE_VALIDATION = 'Cette action valide le contenu et attribue sa référence documentaire. Elle ne constitue pas une signature physique ni un cachet officiel.';

function messageErreur(erreur, action = 'charger') {
  const statut = erreur.response?.status;
  if (statut === 401) return 'Votre session a expiré. Connectez-vous à nouveau.';
  if (statut === 403) return 'Vous n’êtes pas autorisé à consulter ou décider sur ce document.';
  if (statut === 404) return 'Ce document est introuvable ou n’est plus accessible.';
  if (statut === 409) return 'Le document a changé d’état. Actualisez-le pour consulter la situation actuelle avant toute nouvelle décision.';
  if (statut === 422) return action === 'correction'
    ? 'Le motif ne respecte pas les règles attendues. Vérifiez le texte saisi.'
    : 'La décision ne peut pas être appliquée à l’état actuel du document.';
  return action === 'charger'
    ? 'Impossible de charger ce document. Réessayez.'
    : 'La décision n’a pas pu être enregistrée. Réessayez après avoir vérifié l’état du document.';
}

function estContenuCompatible(noeud, parent = null) {
  if (!noeud || typeof noeud !== 'object' || Array.isArray(noeud)) return false;
  const { type, content, attrs, marks, text, ...autres } = noeud;
  if (Object.keys(autres).length) return false;
  if (type === 'text') {
    return typeof text === 'string' && content === undefined && attrs === undefined
      && (marks === undefined || (Array.isArray(marks) && marks.every((mark) => (
        mark && ['bold', 'italic'].includes(mark.type) && mark.attrs === undefined
      ))));
  }
  if (text !== undefined || marks !== undefined) return false;
  if (type === 'doc') return parent === null && attrs === undefined && Array.isArray(content) && content.length > 0
    && content.every((enfant) => estContenuCompatible(enfant, 'doc'));
  if (type === 'paragraph') return parent === 'doc' || parent === 'listItem'
    ? attrs === undefined && Array.isArray(content) && content.every((enfant) => estContenuCompatible(enfant, 'paragraph'))
    : false;
  if (type === 'heading') return parent === 'doc' && attrs?.level === 2 && Object.keys(attrs).length === 1
    && Array.isArray(content) && content.every((enfant) => estContenuCompatible(enfant, 'heading'));
  if (type === 'bulletList') return (parent === 'doc' || parent === 'listItem')
    && attrs === undefined && Array.isArray(content) && content.length > 0
    && content.every((enfant) => estContenuCompatible(enfant, 'bulletList'));
  if (type === 'listItem') return parent === 'bulletList' && attrs === undefined
    && Array.isArray(content) && content.length > 0
    && content.every((enfant) => (enfant.type === 'paragraph' || enfant.type === 'bulletList')
      && estContenuCompatible(enfant, 'listItem'));
  return false;
}

function rendreContenu(document) {
  const contenu = document?.courrier?.contenu;
  if (estContenuCompatible(contenu)) return <TipTapEditor content={contenu} editable={false} />;
  const texte = typeof contenu === 'string' ? contenu : JSON.stringify(contenu ?? null, null, 2);
  return (
    <div>
      <Alert tone="info" className="mb-3">Format non pris en charge pour l’aperçu. Le contenu brut est conservé sans interprétation.</Alert>
      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-card border border-border bg-surface-sunken p-4 text-sm">{texte}</pre>
    </div>
  );
}

function statutLabel(document) {
  if (document?.statut === 'soumis_directeur') return 'À examiner';
  if (document?.statut === 'a_corriger') return 'Correction demandée';
  if (document?.statut === 'brouillon' && document.soumis_at) return 'Correction en préparation';
  if (document?.statut === 'brouillon') return 'Brouillon — non soumis';
  if (document?.statut === 'valide') return 'Contenu validé';
  return document?.statut_label ?? document?.statut ?? 'Statut indisponible';
}

function reponseDecisionCoherente(document, id, type) {
  const statutAttendu = type === 'correction' ? 'a_corriger' : 'valide';
  return document !== null
    && typeof document === 'object'
    && !Array.isArray(document)
    && document.id !== undefined
    && String(document.id) === String(id)
    && document.origine === 'autonome'
    && document.statut === statutAttendu;
}

export function DocumentInterneDirecteurPage() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [dialogueCorrection, setDialogueCorrection] = useState(false);
  const [motif, setMotif] = useState('');
  const [confirmationValidation, setConfirmationValidation] = useState(false);
  const [operationEnCours, setOperationEnCours] = useState(false);
  const [actualisationRequise, setActualisationRequise] = useState(false);
  const generationDocument = useRef(0);
  const generationChargement = useRef(0);
  const operationRef = useRef(null);

  const charger = useCallback(async (signal, preserverDocument = false) => {
    const chargementId = ++generationChargement.current;
    const generation = generationDocument.current;
    if (!preserverDocument) setChargement(true);
    if (!preserverDocument) {
      setErreur(null);
      setActualisationRequise(false);
    }
    try {
      const resultat = await getDocumentInterneAutonome(id, signal);
      if (!resultat || String(resultat.id) !== String(id)) {
        throw new Error('Réponse de document incohérente');
      }
      if (generationDocument.current === generation && generationChargement.current === chargementId && !signal?.aborted) {
        setDocument(resultat);
        setErreur(null);
        setActualisationRequise(false);
      }
    } catch (err) {
      if (generationDocument.current === generation && generationChargement.current === chargementId && !signal?.aborted && err.code !== 'ERR_CANCELED') {
        if (!preserverDocument) setDocument(null);
        setErreur(preserverDocument
          ? 'La décision a peut-être été enregistrée, mais son résultat n’a pas pu être confirmé. Actualisez le document avant toute nouvelle décision.'
          : messageErreur(err));
        setActualisationRequise(preserverDocument);
      }
    } finally {
      if (generationDocument.current === generation && generationChargement.current === chargementId && !signal?.aborted) {
        setChargement(false);
      }
    }
  }, [id]);

  useEffect(() => {
    generationDocument.current += 1;
    const generation = generationDocument.current;
    operationRef.current = null;
    setDocument(null);
    setErreur(null);
    setDialogueCorrection(false);
    setMotif('');
    setConfirmationValidation(false);
    setOperationEnCours(false);
    setChargement(true);
    const controleur = new AbortController();
    charger(controleur.signal);
    return () => {
      if (generationDocument.current === generation) generationDocument.current += 1;
      generationChargement.current += 1;
      controleur.abort();
    };
  }, [charger]);

  const actualiser = useCallback(() => {
    void charger(undefined, true);
  }, [charger]);

  const decider = async (type) => {
    if (!documentAutonome || !STATUTS_DECISION.includes(document.statut) || actualisationRequise || operationRef.current) return;
    if (type === 'correction' && (!motif.trim() || motif.length > 5000)) return;
    const generation = generationDocument.current;
    const documentId = id;
    const operation = Symbol(type);
    operationRef.current = operation;
    setOperationEnCours(true);
    setErreur(null);
    setActualisationRequise(false);
    try {
      if (type === 'correction') {
        const resultat = await demanderCorrectionDocumentProduit(documentId, motif.trim());
        if (generationDocument.current !== generation || id !== documentId || operationRef.current !== operation) return;
        if (!reponseDecisionCoherente(resultat, documentId, type)) {
          setErreur('La décision a peut-être été enregistrée, mais la réponse reçue est incomplète. Vérifiez l’état du document avant toute nouvelle décision.');
          setActualisationRequise(true);
          setDialogueCorrection(false);
          setConfirmationValidation(false);
          return;
        }
        setDocument(resultat);
      } else {
        const resultat = await validerDocumentProduit(documentId);
        if (generationDocument.current !== generation || id !== documentId || operationRef.current !== operation) return;
        if (!reponseDecisionCoherente(resultat, documentId, type)) {
          setErreur('La décision a peut-être été enregistrée, mais la réponse reçue est incomplète. Vérifiez l’état du document avant toute nouvelle décision.');
          setActualisationRequise(true);
          setDialogueCorrection(false);
          setConfirmationValidation(false);
          return;
        }
        setDocument(resultat);
      }
      if (generationDocument.current !== generation || id !== documentId || operationRef.current !== operation) return;
      setDialogueCorrection(false);
      setConfirmationValidation(false);
      setMotif('');
      await charger(undefined, true);
    } catch (err) {
      if (generationDocument.current === generation && id === documentId && operationRef.current === operation) {
        const statutHttp = err.response?.status;
        const actualisationNecessaire = !err.response
          || statutHttp === 409
          || (statutHttp >= 500 && statutHttp < 600);
        setErreur(actualisationNecessaire
          ? 'La décision a peut-être été enregistrée, mais son résultat est incertain. Actualisez le document avant toute nouvelle décision.'
          : messageErreur(err, type));
        setActualisationRequise(actualisationNecessaire);
        if (actualisationNecessaire) {
          setDialogueCorrection(false);
          setConfirmationValidation(false);
        }
      }
    } finally {
      if (generationDocument.current === generation && id === documentId && operationRef.current === operation) {
        operationRef.current = null;
        setOperationEnCours(false);
      }
    }
  };

  const documentCorrespondant = document !== null && String(document.id) === String(id);
  const documentAutonome = documentCorrespondant && document.origine === 'autonome';
  const statut = documentAutonome ? document.statut : null;
  const decisionAutorisee = documentAutonome && STATUTS_DECISION.includes(statut) && !actualisationRequise;
  const motifValide = motif.trim().length > 0 && motif.length <= 5000;

  return (
    <div>
      <PageHeader title="Document interne" description="Consultation et décision sur un document autonome transmis à la direction." />
      <p className="mb-4"><Link to="/direction/directeur/documents-internes" className="text-primary hover:underline">Retour aux documents internes</Link></p>
      {erreur && (
        <Alert tone="error" className="mb-4">
          <span>{erreur}</span>
          {actualisationRequise && <Button className="ml-3" size="sm" variant="secondary" onClick={actualiser}>Actualiser le document</Button>}
        </Alert>
      )}
      {chargement || (document !== null && !documentCorrespondant) ? <LoadingBlock label="Chargement du document…" /> : documentCorrespondant && !documentAutonome ? (
        <Alert tone="info">Cette ressource ne correspond pas au périmètre des documents internes autonomes.</Alert>
      ) : documentAutonome ? (
        <>
          <Card className="mb-4">
            <CardHeader title={document.courrier?.objet ?? 'Document sans objet'} description={`Direction productrice : ${document.courrier?.direction_origine?.nom ?? 'Indisponible'}`} />
            <CardBody className="grid gap-3 text-sm md:grid-cols-2">
              <p>Créateur : {document.tracabilite?.createur?.name ?? '—'}</p>
              <p>Directeur assigné : {document.directeur?.name ?? '—'}</p>
              <p>Statut : <Badge tone={statut === 'valide' ? 'success' : statut === 'soumis_directeur' ? 'info' : statut === 'a_corriger' ? 'warning' : 'neutral'}>{statutLabel(document)}</Badge></p>
              <p>Référence documentaire : {document.courrier?.reference_documentaire ?? '—'}</p>
              {document.motif_correction && <p className="md:col-span-2">Motif de correction : {document.motif_correction}</p>}
              {document.soumis_at && <p>Soumis le : {formaterDateHeure(document.soumis_at) ?? '—'}</p>}
              {document.valide_at && <p>Validé le : {formaterDateHeure(document.valide_at) ?? '—'}</p>}
            </CardBody>
          </Card>

          <Card className="mb-4">
            <CardHeader title="Contenu" description="Consultation en lecture seule." />
            <CardBody>{rendreContenu(document)}</CardBody>
          </Card>

          {document.tracabilite && (
            <Card className="mb-4">
              <CardHeader title="Traçabilité" />
              <CardBody className="grid gap-2 text-sm md:grid-cols-2">
                <p>Créé par : {document.tracabilite.createur?.name ?? '—'}</p>
                <p>Dernier éditeur : {document.tracabilite.dernier_editeur?.name ?? '—'}</p>
                <p>Soumis par : {document.tracabilite.soumis_par?.name ?? '—'}</p>
                <p>Correction demandée par : {document.tracabilite.correction_demandee_par?.name ?? '—'}</p>
                <p>Validé par : {document.tracabilite.valide_par?.name ?? '—'}</p>
              </CardBody>
            </Card>
          )}

          {Array.isArray(document.historique) && (
            <Card className="mb-4">
              <CardHeader title="Historique" />
              <CardBody>
                {document.historique.length ? (
                  <ol className="space-y-2 text-sm">
                    {document.historique.map((entree, index) => (
                      <li key={`${entree.action}-${entree.date}-${index}`}>
                        {entree.action} · {entree.acteur?.name ?? 'Acteur indisponible'} · {formaterDateHeure(entree.date) ?? 'Date indisponible'}
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-sm text-text-muted">Aucun événement historique disponible.</p>}
              </CardBody>
            </Card>
          )}

          {decisionAutorisee && (
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" disabled={operationEnCours} onClick={() => setDialogueCorrection(true)}>Demander une correction</Button>
              <Button disabled={operationEnCours} onClick={() => setConfirmationValidation(true)}>Valider le contenu</Button>
            </div>
          )}
        </>
      ) : !erreur ? <Alert tone="info">Aucun document disponible.</Alert> : null}

      {documentAutonome && dialogueCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true" aria-labelledby="dialogue-correction-titre">
          <div className="w-full max-w-lg rounded-modal border border-border-strong bg-surface-raised p-6 shadow-raised">
            <h2 id="dialogue-correction-titre" className="font-heading text-section-title font-semibold">Demander une correction</h2>
            <p className="mt-2 text-sm text-text-muted">Indiquez le motif qui sera communiqué au secrétariat.</p>
            <Field label="Motif de correction" htmlFor="motif-correction" required hint={`${motif.length} / 5 000 caractères`}>
              <textarea
                id="motif-correction"
                className={inputClass}
                rows={5}
                maxLength={5000}
                value={motif}
                onChange={(event) => setMotif(event.target.value)}
                disabled={operationEnCours}
              />
            </Field>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="secondary"
                disabled={operationEnCours}
                onClick={() => {
                  setDialogueCorrection(false);
                  setMotif('');
                }}
              >
                Annuler
              </Button>
              <Button disabled={operationEnCours || !motifValide} loading={operationEnCours} onClick={() => decider('correction')}>
                Confirmer la demande de correction
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={documentAutonome && confirmationValidation}
        title="Valider le contenu ?"
        description={MESSAGE_VALIDATION}
        confirmLabel="Valider le contenu"
        pending={operationEnCours}
        onCancel={() => setConfirmationValidation(false)}
        onConfirm={() => decider('validation')}
      />
    </div>
  );
}
