import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { useToast } from '../../../shared/components/ui/Toast';
import { ROLES } from '../../kernel/constants';
import { useAuthStore } from '../../kernel/store/authStore';
import { TipTapEditor } from '../components/TipTapEditor';
import {
  creerDocumentInterneAutonome,
  getDocumentInterneAutonome,
  sauvegarderDocumentInterneAutonome,
  soumettreDocumentInterneAutonome,
} from '../api/courrierApi';

const CONTENU_VIDE = { type: 'doc', content: [{ type: 'paragraph' }] };
const STATUTS_MODIFIABLES = ['brouillon', 'a_corriger'];
const LIBELLES_ACTIONS = {
  'document_direction.autonome_cree': 'Document créé',
  'document_direction.brouillon_modifie': 'Brouillon modifié',
  'document_direction.soumis': 'Document soumis',
  'document_direction.correction_demandee': 'Correction demandée',
  'document_direction.valide': 'Document validé',
};

function texteContenu(contenu) {
  if (!contenu || typeof contenu !== 'object') return '';
  if (contenu.type === 'text' && typeof contenu.text === 'string') return contenu.text;
  return Array.isArray(contenu.content) ? contenu.content.map(texteContenu).join(' ') : '';
}

function messageErreur(erreur, action) {
  const statut = erreur.response?.status;
  if (statut === 401) return 'Votre session a expiré. Connectez-vous à nouveau.';
  if (statut === 403) return "Vous n’êtes pas autorisé à effectuer cette action.";
  if (statut === 404) return 'Ce document est introuvable ou n’est pas accessible.';
  if (statut === 409) return 'La version ou le statut du document a changé depuis son chargement. Vos modifications locales sont conservées. Consultez la version serveur avant de réessayer.';
  if (statut === 422) return 'Certaines informations sont invalides. Vérifiez les champs signalés.';
  return `Impossible ${action} le document. Réessayez.`;
}

function erreursChamps(erreur) {
  const erreurs = erreur.response?.data?.errors;
  if (!erreurs || typeof erreurs !== 'object') return {};
  return Object.fromEntries(Object.entries(erreurs).map(([champ, messages]) => [champ, Array.isArray(messages) ? messages[0] : String(messages)]));
}

function tonaliteStatut(statut) {
  if (statut === 'valide') return 'success';
  if (statut === 'a_corriger') return 'warning';
  if (statut === 'soumis_directeur') return 'info';
  return 'neutral';
}

function champDate(valeur) {
  if (!valeur) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valeur));
}

function aClesExactes(valeur, cles) {
  return Object.keys(valeur).every((cle) => cles.includes(cle));
}

function texteEtMarquesPrisEnCharge(noeud) {
  if (!noeud || typeof noeud !== 'object' || noeud.type !== 'text' || typeof noeud.text !== 'string') return false;
  if (!aClesExactes(noeud, ['type', 'text', 'marks'])) return false;
  if (Object.hasOwn(noeud, 'marks') && !Array.isArray(noeud.marks)) return false;
  return (noeud.marks ?? []).every((marque) =>
    marque && typeof marque === 'object'
    && ['bold', 'italic'].includes(marque.type)
    && aClesExactes(marque, ['type'])
  );
}

function contenuAutonomePrisEnCharge(noeud, parent = null) {
  if (!noeud || typeof noeud !== 'object' || Array.isArray(noeud) || typeof noeud.type !== 'string') return false;

  if (noeud.type === 'doc') {
    return parent === null
      && aClesExactes(noeud, ['type', 'content'])
      && Array.isArray(noeud.content)
      && noeud.content.length > 0
      && noeud.content.every((enfant) => contenuAutonomePrisEnCharge(enfant, 'doc'));
  }

  if (noeud.type === 'text') return parent === 'inline' && texteEtMarquesPrisEnCharge(noeud);

  if (noeud.type === 'paragraph' || noeud.type === 'heading') {
    const cles = noeud.type === 'heading' ? ['type', 'attrs', 'content'] : ['type', 'content'];
    const attrsValides = noeud.type !== 'heading'
      ? !Object.hasOwn(noeud, 'attrs')
      : (!Object.hasOwn(noeud, 'attrs')
        || (noeud.attrs && aClesExactes(noeud.attrs, ['level']) && noeud.attrs.level === 2));
    return ['doc', 'listItem'].includes(parent)
      && aClesExactes(noeud, cles)
      && attrsValides
      && (noeud.content === undefined
        || (Array.isArray(noeud.content) && noeud.content.every((enfant) => contenuAutonomePrisEnCharge(enfant, 'inline'))));
  }

  if (noeud.type === 'bulletList') {
    return ['doc', 'listItem'].includes(parent)
      && aClesExactes(noeud, ['type', 'content'])
      && Array.isArray(noeud.content)
      && noeud.content.length > 0
      && noeud.content.every((enfant) => contenuAutonomePrisEnCharge(enfant, 'bulletList'));
  }

  if (noeud.type === 'listItem') {
    return parent === 'bulletList'
      && aClesExactes(noeud, ['type', 'content'])
      && Array.isArray(noeud.content)
      && noeud.content.length > 0
      && noeud.content.every((enfant) => contenuAutonomePrisEnCharge(enfant, 'listItem'));
  }

  return false;
}

function useAvertissementAvantAbandon(modificationsLocales) {
  useEffect(() => {
    if (!modificationsLocales) return undefined;
    function avertir(event) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', avertir);
    return () => window.removeEventListener('beforeunload', avertir);
  }, [modificationsLocales]);
}

export function DocumentInterneAutonomePage() {
  const { id } = useParams();
  return id ? <DetailDocument id={id} /> : <CreationDocument />;
}

function CreationDocument() {
  const [objet, setObjet] = useState('');
  const [contenu, setContenu] = useState(CONTENU_VIDE);
  const [erreur, setErreur] = useState('');
  const [erreurs, setErreurs] = useState({});
  const [enregistrement, setEnregistrement] = useState(false);
  const navigate = useNavigate();
  const contenuModifie = JSON.stringify(contenu) !== JSON.stringify(CONTENU_VIDE);
  const modificationsLocales = objet !== '' || contenuModifie;
  const modificationsLocalesRef = useRef(modificationsLocales);
  modificationsLocalesRef.current = modificationsLocales;
  const blocker = useBlocker(() => modificationsLocalesRef.current);
  useAvertissementAvantAbandon(modificationsLocales);

  async function creer(event) {
    event.preventDefault();
    const nouvellesErreurs = {};
    if (!objet.trim()) nouvellesErreurs.objet = "L’objet est obligatoire.";
    if (!texteContenu(contenu).trim()) nouvellesErreurs.contenu = 'Le contenu est obligatoire.';
    setErreurs(nouvellesErreurs);
    setErreur('');
    if (Object.keys(nouvellesErreurs).length) return;

    setEnregistrement(true);
    try {
      const document = await creerDocumentInterneAutonome({ objet: objet.trim(), contenu });
      modificationsLocalesRef.current = false;
      setObjet('');
      setContenu(CONTENU_VIDE);
      navigate(`/direction/documents-internes/${document.id}`, { replace: true, state: { documentCree: true } });
    } catch (err) {
      setErreurs(erreursChamps(err));
      setErreur(messageErreur(err, 'de créer'));
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div>
      <PageHeader title="Nouveau document interne" description="La direction productrice est déterminée automatiquement à partir de votre compte." />
      {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}
      <Card>
        <CardBody>
          <form className="space-y-5" onSubmit={creer} noValidate>
            <Field label="Objet" htmlFor="objet-document-interne" required error={erreurs.objet}>
              <input
                id="objet-document-interne"
                className={inputClass}
                value={objet}
                maxLength={255}
                required
                onChange={(event) => setObjet(event.target.value)}
              />
            </Field>
            <Field label="Contenu" htmlFor="contenu-document-interne" required error={erreurs.contenu}>
              <TipTapEditor id="contenu-document-interne" content={contenu} onChange={setContenu} />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Link to="/direction/documents-internes" className="inline-flex items-center justify-center rounded-field bg-surface px-3.5 py-2 text-sm font-medium text-text shadow-sm ring-1 ring-inset ring-border-strong hover:bg-surface-sunken">
                Annuler
              </Link>
              <Button type="submit" loading={enregistrement}>Créer le brouillon</Button>
            </div>
          </form>
        </CardBody>
      </Card>
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Abandonner ce document non enregistré ?"
        description="Les informations saisies ne seront pas conservées."
        confirmLabel="Abandonner"
        tone="danger"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  );
}

function DetailDocument({ id }) {
  const [document, setDocument] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');
  const [erreurSauvegarde, setErreurSauvegarde] = useState('');
  const [erreurs, setErreurs] = useState({});
  const [objet, setObjet] = useState('');
  const [contenu, setContenu] = useState(CONTENU_VIDE);
  const [enregistrement, setEnregistrement] = useState(false);
  const [soumissionEnCours, setSoumissionEnCours] = useState(false);
  const [confirmationSoumission, setConfirmationSoumission] = useState(false);
  const generationRequeteRef = useRef(0);
  const idDocumentCourantRef = useRef(String(id));
  const mutationEnCoursRef = useRef(null);
  const [conflit, setConflit] = useState(false);
  const [versionServeur, setVersionServeur] = useState(null);
  const [chargementServeur, setChargementServeur] = useState(false);
  const [erreurServeur, setErreurServeur] = useState('');
  const [remplacementConfirme, setRemplacementConfirme] = useState(false);
  const location = useLocation();
  const toast = useToast();
  const utilisateur = useAuthStore((state) => state.user);
  idDocumentCourantRef.current = String(id);

  function requeteCourante(generation, documentId) {
    return generationRequeteRef.current === generation
      && idDocumentCourantRef.current === String(documentId);
  }

  const chargerServeur = useCallback(async (signal) => {
    const resultat = await getDocumentInterneAutonome(id, signal);
    if (resultat.origine !== 'autonome') {
      const origineInattendue = new Error('Cette ressource ne correspond pas à un document autonome.');
      origineInattendue.status = 422;
      throw origineInattendue;
    }
    return resultat;
  }, [id]);

  useEffect(() => {
    const controleur = new AbortController();
    const generation = ++generationRequeteRef.current;
    mutationEnCoursRef.current = null;
    setChargement(true);
    setDocument(null);
    setErreurChargement('');
    setErreurSauvegarde('');
    setErreurs({});
    setEnregistrement(false);
    setSoumissionEnCours(false);
    setConfirmationSoumission(false);
    setConflit(false);
    setVersionServeur(null);
    setChargementServeur(false);
    setErreurServeur('');
    setRemplacementConfirme(false);
    chargerServeur(controleur.signal)
      .then((resultat) => {
        if (!requeteCourante(generation, id) || controleur.signal.aborted) return;
        setDocument(resultat);
        setObjet(resultat.courrier?.objet ?? '');
        setContenu(resultat.courrier?.contenu ?? CONTENU_VIDE);
      })
      .catch((err) => {
        if (requeteCourante(generation, id) && !controleur.signal.aborted && err.code !== 'ERR_CANCELED') {
          setDocument(null);
          setErreurChargement(err.status === 422 ? err.message : messageErreur(err, 'de charger'));
        }
      })
      .finally(() => {
        if (requeteCourante(generation, id) && !controleur.signal.aborted) setChargement(false);
      });
    return () => {
      controleur.abort();
      if (generationRequeteRef.current === generation) generationRequeteRef.current += 1;
    };
  }, [chargerServeur, id]);

  const documentCorrespondant = String(document?.id) === String(id);
  const modifiable = STATUTS_MODIFIABLES.includes(document?.statut);
  const objetInitial = document?.courrier?.objet ?? '';
  const contenuInitial = document?.courrier?.contenu ?? CONTENU_VIDE;
  const changements = objet !== objetInitial || JSON.stringify(contenu) !== JSON.stringify(contenuInitial);
  const contenuModifiable = contenuAutonomePrisEnCharge(contenuInitial);
  const modificationsLocales = changements;
  const versionDisponible = Number.isInteger(document?.version_contenu) && document.version_contenu > 0;
  const afficherSoumission = documentCorrespondant
    && utilisateur?.role === ROLES.SECRETARIAT_DIRECTION
    && document?.origine === 'autonome'
    && document?.statut === 'brouillon'
    && versionDisponible
    && contenuModifiable;
  const peutSoumettre = afficherSoumission
    && !changements
    && !enregistrement
    && !soumissionEnCours
    && !conflit;
  const blocker = useBlocker(modificationsLocales);
  useAvertissementAvantAbandon(modificationsLocales);
  const dateCorrection = document?.correction_demandee_at;
  const titre = document?.courrier?.objet || 'Document interne';

  async function sauvegarder(event) {
    event.preventDefault();
    setErreurSauvegarde('');
    const nouvellesErreurs = {};
    if (!objet.trim()) nouvellesErreurs.objet = "L’objet est obligatoire.";
    if (!texteContenu(contenu).trim()) nouvellesErreurs.contenu = 'Le contenu est obligatoire.';
    setErreurs(nouvellesErreurs);
    if (Object.keys(nouvellesErreurs).length || !documentCorrespondant || !document || !modifiable || !contenuModifiable || mutationEnCoursRef.current) return;

    const generation = generationRequeteRef.current;
    const documentId = document.id;
    const operation = { generation, documentId, type: 'sauvegarde' };
    mutationEnCoursRef.current = operation;
    setEnregistrement(true);
    try {
      const resultat = await sauvegarderDocumentInterneAutonome(documentId, {
        objet: objet.trim(),
        contenu,
        version_contenu: document.version_contenu,
      });
      if (!requeteCourante(generation, documentId) || mutationEnCoursRef.current !== operation) return;
      if (resultat.origine !== 'autonome') throw new Error('La réponse ne correspond pas à un document autonome.');
      setDocument(resultat);
      setObjet(resultat.courrier?.objet ?? '');
      setContenu(resultat.courrier?.contenu ?? CONTENU_VIDE);
      setConflit(false);
      setVersionServeur(null);
      toast.success('Brouillon enregistré.');
    } catch (err) {
      if (!requeteCourante(generation, documentId) || mutationEnCoursRef.current !== operation) return;
      setErreurs(erreursChamps(err));
      setErreurSauvegarde(messageErreur(err, 'd’enregistrer'));
      if (err.response?.status === 409) setConflit(true);
    } finally {
      if (mutationEnCoursRef.current === operation) {
        mutationEnCoursRef.current = null;
        if (requeteCourante(generation, documentId)) setEnregistrement(false);
      }
    }
  }

  async function soumettre() {
    if (!peutSoumettre || mutationEnCoursRef.current || !documentCorrespondant || !document) return;
    const generation = generationRequeteRef.current;
    const documentId = document.id;
    const operation = { generation, documentId, type: 'soumission' };
    mutationEnCoursRef.current = operation;
    setSoumissionEnCours(true);
    setErreurSauvegarde('');

    try {
      const resultat = await soumettreDocumentInterneAutonome(documentId, document.version_contenu);
      if (!requeteCourante(generation, documentId) || mutationEnCoursRef.current !== operation) return;
      if (resultat.origine !== 'autonome') throw new Error('La réponse ne correspond pas à un document autonome.');
      setDocument(resultat);
      setObjet(resultat.courrier?.objet ?? '');
      setContenu(resultat.courrier?.contenu ?? CONTENU_VIDE);
      setConflit(false);
      setVersionServeur(null);
      toast.success('Document soumis au Directeur pour examen.');
    } catch (err) {
      if (!requeteCourante(generation, documentId) || mutationEnCoursRef.current !== operation) return;
      setErreurs(erreursChamps(err));
      setErreurSauvegarde(messageErreur(err, 'de soumettre'));
      if (err.response?.status === 409) setConflit(true);
    } finally {
      if (mutationEnCoursRef.current === operation) {
        mutationEnCoursRef.current = null;
        if (requeteCourante(generation, documentId)) {
          setSoumissionEnCours(false);
          setConfirmationSoumission(false);
        }
      }
    }
  }

  async function consulterVersionServeur() {
    const generation = generationRequeteRef.current;
    const documentId = document?.id;
    if (!documentId || !documentCorrespondant) return;
    setChargementServeur(true);
    setErreurServeur('');
    try {
      const resultat = await chargerServeur();
      if (!requeteCourante(generation, documentId)) return;
      setVersionServeur(resultat);
    } catch (err) {
      if (!requeteCourante(generation, documentId)) return;
      setErreurServeur(err.status === 422 ? err.message : messageErreur(err, 'de charger'));
    } finally {
      if (requeteCourante(generation, documentId)) setChargementServeur(false);
    }
  }

  async function remplacerParVersionServeur() {
    if (!versionServeur) return;
    setRemplacementConfirme(true);
  }

  function confirmerRemplacementParVersionServeur() {
    if (!versionServeur || !documentCorrespondant || String(versionServeur.id) !== String(id)) return;
    setDocument(versionServeur);
    setObjet(versionServeur.courrier?.objet ?? '');
    setContenu(versionServeur.courrier?.contenu ?? CONTENU_VIDE);
    setVersionServeur(null);
    setConflit(false);
    setErreurSauvegarde('');
    setRemplacementConfirme(false);
  }

  if (chargement || (document && !documentCorrespondant)) return <LoadingBlock label="Chargement du document interne…" />;

  if (!document) {
    return (
      <div>
        <PageHeader title="Document interne indisponible" />
        <Alert tone="error" className="mb-4">{erreurChargement || 'Ce document est introuvable ou inaccessible.'}</Alert>
        <Link to="/direction/documents-internes" className="inline-flex items-center justify-center rounded-field bg-surface px-3.5 py-2 text-sm font-medium text-text shadow-sm ring-1 ring-inset ring-border-strong hover:bg-surface-sunken">Retour à la liste</Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={titre}
        description="Document interne autonome de votre direction."
        action={<Link to="/direction/documents-internes" className="inline-flex items-center justify-center rounded-field bg-surface px-3.5 py-2 text-sm font-medium text-text shadow-sm ring-1 ring-inset ring-border-strong hover:bg-surface-sunken">Retour à la liste</Link>}
      />

      {location.state?.documentCree && (
        <Alert tone="success" className="mb-4">Le document a été créé au statut brouillon.</Alert>
      )}
      {erreurSauvegarde && !conflit && <Alert tone="error" className="mb-4">{erreurSauvegarde}</Alert>}

      <Card className="mb-5">
        <CardHeader title="Suivi du document" description="Informations de traçabilité et état courant." />
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><p className="text-xs font-medium uppercase text-text-subtle">Statut</p><div className="mt-1"><Badge tone={tonaliteStatut(document.statut)}>{document.statut_label ?? document.statut}</Badge></div></div>
          <div><p className="text-xs font-medium uppercase text-text-subtle">Créateur</p><p className="mt-1 text-sm text-text">{document.tracabilite?.createur?.name ?? '—'}</p></div>
          <div><p className="text-xs font-medium uppercase text-text-subtle">Dernier éditeur</p><p className="mt-1 text-sm text-text">{document.tracabilite?.dernier_editeur?.name ?? '—'}</p></div>
          <div><p className="text-xs font-medium uppercase text-text-subtle">Version du contenu</p><p className="mt-1 text-sm text-text">{document.version_contenu ?? '—'}</p></div>
          <div><p className="text-xs font-medium uppercase text-text-subtle">Dernière modification</p><p className="mt-1 text-sm text-text">{document.modifie_at ? champDate(document.modifie_at) : '—'}</p></div>
          <div><p className="text-xs font-medium uppercase text-text-subtle">Créé le</p><p className="mt-1 text-sm text-text">{document.cree_at ? champDate(document.cree_at) : '—'}</p></div>
          {document.courrier?.reference_documentaire && <div><p className="text-xs font-medium uppercase text-text-subtle">Référence institutionnelle</p><p className="mt-1 text-sm text-text">{document.courrier.reference_documentaire}</p></div>}
        </CardBody>
      </Card>

      {document.statut === 'a_corriger' && document.motif_correction && (
        <Alert tone="info" className="mb-5">
          <span className="font-semibold">Correction demandée :</span> {document.motif_correction}
          {dateCorrection && <span className="mt-1 block text-xs">Demandée le {champDate(dateCorrection)}</span>}
        </Alert>
      )}

      <Card className="mb-5">
        <CardHeader title={modifiable ? 'Brouillon collaboratif' : 'Contenu du document'} description={modifiable ? 'Les secrétaires habilités de votre direction peuvent modifier ce brouillon.' : 'Ce document n’est pas modifiable dans son statut actuel.'} />
        <CardBody>
          {modifiable ? (
            <form className="space-y-5" onSubmit={sauvegarder} noValidate>
              {!contenuModifiable && (
                <Alert tone="error">
                  Ce document contient des éléments riches que l’éditeur ne sait pas préserver. L’édition est désactivée pour éviter toute perte. Le JSON original est conservé ci-dessous.
                </Alert>
              )}
              <Field label="Objet" htmlFor="objet-document-interne" required error={erreurs.objet}>
                <input id="objet-document-interne" className={inputClass} value={objet} maxLength={255} disabled={!contenuModifiable} onChange={(event) => setObjet(event.target.value)} />
              </Field>
              <Field label="Contenu" htmlFor="contenu-document-interne" required error={erreurs.contenu}>
                {contenuModifiable ? (
                  <TipTapEditor
                    key={`${document.id}-${document.version_contenu}-${versionServeur?.version_contenu ?? ''}`}
                    id="contenu-document-interne"
                    content={contenu}
                    onChange={setContenu}
                  />
                ) : (
                  <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-field border border-border bg-surface-sunken p-3 text-xs text-text">{JSON.stringify(contenuInitial, null, 2)}</pre>
                )}
              </Field>
              {conflit && (
                <div className="space-y-3">
                  <Alert tone="error">La version ou le statut du document a changé. Vos modifications locales sont conservées et aucune action forcée n’a été tentée.</Alert>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" loading={chargementServeur} onClick={consulterVersionServeur}>Consulter la version serveur</Button>
                  </div>
                </div>
              )}
              {erreurServeur && <Alert tone="error">{erreurServeur}</Alert>}
              {versionServeur && (
                <Card className="border-ont-blue-200 bg-surface-sunken/40">
                  <CardHeader title={`Version serveur — v${versionServeur.version_contenu}`} description="Lecture seule; votre formulaire local reste inchangé tant que vous ne confirmez pas son remplacement." />
                  <CardBody className="space-y-3">
                    <p className="text-sm font-medium text-text">{versionServeur.courrier?.objet}</p>
                    {contenuAutonomePrisEnCharge(versionServeur.courrier?.contenu ?? CONTENU_VIDE) ? (
                      <TipTapEditor content={versionServeur.courrier?.contenu ?? CONTENU_VIDE} editable={false} />
                    ) : (
                      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-field border border-border bg-surface-sunken p-3 text-xs text-text">{JSON.stringify(versionServeur.courrier?.contenu, null, 2)}</pre>
                    )}
                    {contenuAutonomePrisEnCharge(versionServeur.courrier?.contenu ?? CONTENU_VIDE) && (
                      <Button type="button" variant="danger" onClick={remplacerParVersionServeur}>Remplacer le contenu local par cette version</Button>
                    )}
                  </CardBody>
                </Card>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                {afficherSoumission && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!peutSoumettre}
                    onClick={() => setConfirmationSoumission(true)}
                  >
                    Soumettre au Directeur
                  </Button>
                )}
                <Button type="submit" loading={enregistrement} disabled={!changements || !contenuModifiable}>Enregistrer le brouillon</Button>
              </div>
              {afficherSoumission && changements && (
                <p className="text-right text-sm text-text-muted">Enregistrez vos modifications avant de soumettre le document.</p>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <div><p className="text-xs font-medium uppercase text-text-subtle">Objet</p><p className="mt-1 font-semibold text-text">{document.courrier?.objet}</p></div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-text-subtle">Contenu</p>
                {contenuAutonomePrisEnCharge(document.courrier?.contenu ?? CONTENU_VIDE) ? (
                  <TipTapEditor content={document.courrier?.contenu ?? CONTENU_VIDE} editable={false} />
                ) : (
                  <>
                    <Alert tone="info" className="mb-2">Certains éléments riches ne sont pas affichables par l’éditeur; le JSON reçu est présenté sans transformation.</Alert>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-field border border-border bg-surface-sunken p-3 text-xs text-text">{JSON.stringify(document.courrier?.contenu, null, 2)}</pre>
                  </>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {Array.isArray(document.historique) && document.historique.length > 0 && (
        <Card>
          <CardHeader title="Historique disponible" description="Actions journalisées par le système." />
          <CardBody>
            <ol className="space-y-3">
              {document.historique.map((action, index) => (
                <li key={`${action.action}-${action.date}-${index}`} className="flex flex-wrap justify-between gap-2 border-l-2 border-ont-blue-200 pl-3 text-sm">
                  <span className="font-medium text-text">{LIBELLES_ACTIONS[action.action] ?? action.action}</span>
                  <span className="text-text-subtle">{action.acteur?.name ?? 'Acteur indisponible'} · {action.date ? champDate(action.date) : 'Date indisponible'}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Abandonner les modifications locales ?"
        description="Les changements non enregistrés seront perdus."
        confirmLabel="Abandonner"
        tone="danger"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
      <ConfirmDialog
        open={Boolean(versionServeur && contenuAutonomePrisEnCharge(versionServeur.courrier?.contenu ?? CONTENU_VIDE) && remplacementConfirme)}
        title="Remplacer vos modifications locales ?"
        description="Le formulaire sera remplacé par la version serveur actuellement chargée. Cette action supprimera vos changements locaux non enregistrés."
        confirmLabel="Remplacer le contenu local"
        tone="danger"
        onConfirm={confirmerRemplacementParVersionServeur}
        onCancel={() => setRemplacementConfirme(false)}
      />
      <ConfirmDialog
        open={confirmationSoumission}
        title="Soumettre ce document au Directeur pour examen ?"
        description="Le document ne sera plus modifiable pendant son examen, sauf si le Directeur demande une correction."
        confirmLabel="Soumettre au Directeur"
        pending={soumissionEnCours}
        onConfirm={soumettre}
        onCancel={() => {
          if (!mutationEnCoursRef.current) setConfirmationSoumission(false);
        }}
      />
    </div>
  );
}
