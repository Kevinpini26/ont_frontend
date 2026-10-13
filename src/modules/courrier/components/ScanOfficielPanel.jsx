import { useEffect, useRef, useState } from 'react';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { Modal } from '../../../shared/components/ui/Modal';
import { inputClass } from '../../../shared/components/ui/Field';
import { useAuthStore } from '../../kernel/store/authStore';
import { POSTES, ROLES, estDirecteurDirection } from '../../kernel/constants';
import { getDocumentInterneAutonome, transmettreDocumentReception } from '../api/courrierApi';
import { ATTESTATION_SCAN_OFFICIEL, deposerScanOfficiel, erreurScanOfficiel, lirePdfOfficiel, validerFichierScan } from '../api/scanOfficielApi';
import { formaterDateHeure } from '../utils/dateHeure';

function erreurTransmissionReception(erreur) {
  switch (erreur.response?.status) {
    case 401: return 'Votre session a expiré. Connectez-vous à nouveau.';
    case 403:
    case 404: return 'Accès refusé ou document inaccessible pour cette transmission.';
    case 409: return 'La transmission est déjà effectuée ou en conflit. Vérifiez l’état du document avant toute autre démarche.';
    case 422: return 'Le document ne satisfait pas les conditions de transmission. Vérifiez son état et sa référence.';
    case 503: return 'Le résultat de la transmission est incertain. Vérifiez l’état du document avant toute nouvelle tentative.';
    default: return 'Le résultat de la transmission est incertain. Vérifiez l’état du document avant toute nouvelle tentative.';
  }
}

// Monter avec key=document.id : aucune réponse tardive ne doit atteindre un autre document.
export function ScanOfficielPanel({ document: documentMetier, onUpdated, modeReception = false }) {
  const utilisateur = useAuthStore((state) => state.user);
  const marqueur = `ont:scan-officiel:${utilisateur?.id}:${documentMetier.id}`;
  const marqueurTransmission = `ont:transmission-reception:${utilisateur?.id}:${documentMetier.id}`;
  const [incertain, setIncertain] = useState(() => {
    try { return Boolean(sessionStorage.getItem(marqueur)); } catch { return true; }
  });
  const [fichier, setFichier] = useState(null);
  const [attestation, setAttestation] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [confirmationTransmission, setConfirmationTransmission] = useState(false);
  const [transmissionIncertaine, setTransmissionIncertaine] = useState(() => {
    try { return Boolean(sessionStorage.getItem(marqueurTransmission)); } catch { return true; }
  });
  const [operation, setOperation] = useState('');
  const [message, setMessage] = useState('');
  const [erreurs, setErreurs] = useState([]);
  const [depot, setDepot] = useState(null);
  const [apercu, setApercu] = useState(null);
  const verrou = useRef(false);
  const cle = useRef(null);
  const vivant = useRef(true);
  const requetePdf = useRef(null);
  const urlPdf = useRef(null);

  useEffect(() => {
    vivant.current = true;
    return () => {
      vivant.current = false;
      requetePdf.current?.abort();
      if (urlPdf.current) URL.revokeObjectURL(urlPdf.current);
    };
  }, []);

  const historiqueDepot = documentMetier.historique?.find((entree) => entree.action === 'document_direction.scan_officiel_depose');
  const historiqueTransmission = documentMetier.historique?.find((entree) => entree.action === 'document_direction.autonome_transmis_reception');
  const transmis = documentMetier.statut === 'transmis_reception';
  const transmissionComplete = transmis
    && Boolean(documentMetier.transmis_reception_at)
    && Boolean(documentMetier.transmis_reception_par);
  const enregistre = ['scan_enregistre', 'transmis_reception'].includes(documentMetier.statut) || depot?.est_actif === true;
  const memeDirection = utilisateur?.direction_id != null && documentMetier.direction_id != null
    && String(utilisateur.direction_id) === String(documentMetier.direction_id);
  const secretariat = memeDirection && utilisateur?.role === ROLES.SECRETARIAT_DIRECTION;
  const agentReception = utilisateur?.role === ROLES.AGENT_CIRCUIT_COURRIER && utilisateur?.poste === POSTES.RECEPTION;
  const consultation = secretariat || (memeDirection && estDirecteurDirection(utilisateur)
    && String(utilisateur.id) === String(documentMetier.directeur_id) && Boolean(documentMetier.soumis_at))
    || (agentReception && modeReception && transmissionComplete);
  const peutDeposer = secretariat && documentMetier.statut === 'valide' && !enregistre && !historiqueDepot && !incertain;
  const peutTransmettre = secretariat && documentMetier.statut === 'scan_enregistre' && enregistre
    && !transmis && !historiqueTransmission && !transmissionIncertaine;

  function oublierMarqueur() {
    try { sessionStorage.removeItem(marqueur); } catch { /* Le verrou local reste conservateur. */ }
  }

  function oublierMarqueurTransmission() {
    try { sessionStorage.removeItem(marqueurTransmission); } catch { /* Le verrou local reste conservateur. */ }
  }

  async function actualiser() {
    const resultat = await getDocumentInterneAutonome(documentMetier.id);
    if (!resultat || String(resultat.id) !== String(documentMetier.id) || resultat.origine !== 'autonome') throw new Error('Réponse incohérente');
    if (!vivant.current) return null;
    onUpdated(resultat);
    if (resultat.statut === 'scan_enregistre') {
      oublierMarqueur();
      setIncertain(false);
    }
    const transmissionConfirmee = resultat.statut === 'transmis_reception'
      && Boolean(resultat.transmis_reception_at)
      && Boolean(resultat.transmis_reception_par);
    const absenceConfirmee = resultat.statut === 'scan_enregistre'
      && resultat.transmis_reception_at == null
      && resultat.transmis_reception_par == null;
    if (transmissionConfirmee || absenceConfirmee) {
      oublierMarqueurTransmission();
      setTransmissionIncertaine(false);
    }
    if (transmissionConfirmee) {
      oublierMarqueur();
      setIncertain(false);
    }
    return resultat;
  }

  async function verifier() {
    if (verrou.current) return;
    verrou.current = true;
    setOperation('verification');
    setMessage('');
    try {
      const resultat = await actualiser();
      if (!resultat || !vivant.current) return;
      const transmissionConfirmee = resultat.statut === 'transmis_reception'
        && Boolean(resultat.transmis_reception_at)
        && Boolean(resultat.transmis_reception_par);
      setMessage(transmissionConfirmee
        ? 'La transmission à la Réception est confirmée par le serveur.'
        : resultat.statut === 'scan_enregistre'
          ? 'Le scan officiel est confirmé par le serveur ; le document n’est pas encore transmis.'
          : 'Aucun enregistrement de scan n’est confirmé à cet instant. En cas de dépôt incertain, ne recommencez pas : vérifiez à nouveau ultérieurement ou contactez le support.');
    } catch (err) {
      if (vivant.current) setMessage(transmissionIncertaine ? erreurTransmissionReception(err) : erreurScanOfficiel(err));
    } finally {
      verrou.current = false;
      if (vivant.current) setOperation('');
    }
  }

  async function preparer(event) {
    event.preventDefault();
    if (verrou.current || !peutDeposer) return;
    verrou.current = true;
    setOperation('validation');
    setMessage('');
    try {
      const erreur = await validerFichierScan(fichier);
      if (!vivant.current) return;
      const liste = [erreur, !attestation && 'Confirmez l’attestation avant de poursuivre.'].filter(Boolean);
      setErreurs(liste);
      if (!liste.length) setConfirmation(true);
    } catch {
      if (vivant.current) setErreurs(['Impossible de lire ce fichier. Sélectionnez un PDF accessible.']);
    } finally {
      verrou.current = false;
      if (vivant.current) setOperation('');
    }
  }

  async function enregistrer() {
    if (verrou.current || !peutDeposer || !fichier || !attestation) return;
    // Mémoriser uniquement une clé et un verrou, jamais le PDF ou ses octets.
    // Une navigation/recharge pendant le POST impose ensuite une vérification GET.
    try {
      cle.current ??= crypto.randomUUID();
      sessionStorage.setItem(marqueur, cle.current);
    } catch {
      setConfirmation(false);
      setMessage('Le navigateur ne permet pas de sécuriser cette demande. Autorisez le stockage de session et utilisez une connexion sécurisée avant de déposer. Aucun fichier n’a été envoyé.');
      return;
    }
    verrou.current = true;
    setOperation('depot');
    setMessage('');
    setErreurs([]);
    try {
      const resultat = await deposerScanOfficiel(documentMetier.id, fichier, cle.current);
      if (!vivant.current) return;
      if (!resultat?.id || String(resultat.document_produit_direction_id) !== String(documentMetier.id) || resultat.est_actif !== true) throw new Error('Réponse de dépôt incomplète');
      setDepot(resultat);
      setFichier(null);
      setAttestation(false);
      // Garder le marqueur jusqu'à confirmation du GET, même si la navigation interrompt celui-ci.
      setIncertain(true);
      try {
        await actualiser();
        if (vivant.current) setMessage('Le serveur a confirmé l’enregistrement du scan officiel.');
      } catch (err) {
        if (vivant.current) setMessage(`Le scan a été enregistré, mais les informations du document n’ont pas pu être actualisées. ${erreurScanOfficiel(err)}`);
      }
    } catch (err) {
      if (!vivant.current) return;
      const status = err.response?.status;
      const aVerifier = !status || status === 409 || status >= 500;
      setIncertain(aVerifier);
      if (!aVerifier) oublierMarqueur();
      setMessage(erreurScanOfficiel(err));
      if (status === 422) {
        const champs = err.response?.data?.errors ?? {};
        setErreurs(['scan', 'attestation_confirmee', 'idempotency_key', 'document']
          .flatMap((champ) => champs[champ] ?? []).filter((valeur) => typeof valeur === 'string'));
      }
    } finally {
      verrou.current = false;
      if (vivant.current) {
        setOperation('');
        setConfirmation(false);
      }
    }
  }

  async function transmettre() {
    if (verrou.current || !peutTransmettre) return;
    try {
      sessionStorage.setItem(marqueurTransmission, 'pending');
    } catch {
      setConfirmationTransmission(false);
      setMessage('Le navigateur ne permet pas de sécuriser cette demande. Autorisez le stockage de session avant de transmettre. Aucun envoi n’a été effectué.');
      return;
    }

    verrou.current = true;
    setOperation('transmission');
    setMessage('');
    try {
      const resultat = await transmettreDocumentReception(documentMetier.id);
      if (!vivant.current) return;
      if (!resultat
        || String(resultat.id) !== String(documentMetier.id)
        || resultat.statut !== 'transmis_reception'
        || !resultat.transmis_reception_at
        || !resultat.transmis_reception_par) {
        throw new Error('Réponse de transmission incomplète');
      }
      onUpdated(resultat);
      oublierMarqueurTransmission();
      setTransmissionIncertaine(false);
      setMessage('Le document signé et cacheté a été transmis à la Réception.');
    } catch (err) {
      if (!vivant.current) return;
      const status = err.response?.status;
      const aVerifier = !status || status === 409 || status >= 500;
      setTransmissionIncertaine(aVerifier);
      if (!aVerifier) oublierMarqueurTransmission();
      setMessage(erreurTransmissionReception(err));
    } finally {
      verrou.current = false;
      if (vivant.current) {
        setOperation('');
        setConfirmationTransmission(false);
      }
    }
  }

  async function ouvrirPdf(scan) {
    if (verrou.current) return;
    verrou.current = true;
    setOperation(scan ? 'scan' : 'pdf');
    setMessage('');
    const controleur = new AbortController();
    requetePdf.current = controleur;
    try {
      const blob = await lirePdfOfficiel(documentMetier.id, scan, controleur.signal);
      if (!vivant.current || controleur.signal.aborted) return;
      if (urlPdf.current) URL.revokeObjectURL(urlPdf.current);
      urlPdf.current = URL.createObjectURL(blob);
      setApercu({ url: urlPdf.current, scan });
    } catch (err) {
      if (vivant.current && !controleur.signal.aborted) setMessage([401, 403, 404].includes(err.response?.status)
        ? erreurScanOfficiel(err) : 'Le PDF ne peut pas être chargé pour le moment. Vérifiez votre connexion et réessayez.');
    } finally {
      verrou.current = false;
      if (vivant.current) setOperation('');
    }
  }

  function fermerApercu() {
    if (urlPdf.current) URL.revokeObjectURL(urlPdf.current);
    urlPdf.current = null;
    setApercu(null);
  }

  if (documentMetier.origine !== 'autonome' || !['valide', 'scan_enregistre', 'transmis_reception'].includes(documentMetier.statut)) return null;

  return (
    <Card className="mb-5">
      <CardHeader title="Document officiel signé et cacheté" description="Le scan conserve la version imprimée, signée et cachetée physiquement." />
      <CardBody className="space-y-4">
        <p className="text-sm">Référence officielle : <strong>{documentMetier.courrier?.reference_documentaire ?? 'Non disponible'}</strong></p>
        {enregistre ? (
          <div className="space-y-2">
            <Badge tone="success">Scan officiel enregistré</Badge>
            <p className="text-sm text-text-muted">Un nouveau dépôt n’est pas proposé pour ce document.</p>
            {historiqueDepot?.acteur?.name && <p className="text-sm">Déposé par : {historiqueDepot.acteur.name}</p>}
            {(depot?.atteste_at || historiqueDepot?.date) && <p className="text-sm">{depot?.atteste_at ? 'Attesté le' : 'Dépôt enregistré le'} : {formaterDateHeure(depot?.atteste_at ?? historiqueDepot.date)}</p>}
            {depot?.version && <p className="text-sm">Version du dépôt : {depot.version}</p>}
            {depot?.attestation_confirmee && <p className="text-sm">Attestation confirmée lors du dépôt.</p>}
          </div>
        ) : <p className="text-sm text-text-muted">Téléchargez le PDF officiel, imprimez-le, puis faites apposer la signature manuscrite et le cachet physiques requis. Numérisez ensuite le document complet au format PDF.</p>}
        {transmissionComplete && (
          <div className="space-y-2">
            <Badge tone="info">Transmis à la Réception</Badge>
            <p className="text-sm">Transmis le : {formaterDateHeure(documentMetier.transmis_reception_at)}</p>
            <p className="text-sm">Transmis par : {documentMetier.transmis_reception_par.name}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {consultation && documentMetier.statut === 'valide' && !enregistre && <Button type="button" variant="secondary" disabled={Boolean(operation)} loading={operation === 'pdf'} onClick={() => ouvrirPdf(false)}>Télécharger le PDF officiel</Button>}
          {consultation && enregistre && <Button type="button" variant="secondary" disabled={Boolean(operation)} loading={operation === 'scan'} onClick={() => ouvrirPdf(true)}>Consulter le scan officiel</Button>}
        </div>

        {incertain && !enregistre && <Alert>Un dépôt est en attente de vérification. Son résultat est incertain ; le formulaire reste verrouillé et aucun fichier ne sera renvoyé automatiquement.</Alert>}
        {historiqueDepot && !enregistre && <Alert>Un dépôt figure dans l’historique. Vérifiez l’état du document avant toute autre démarche.</Alert>}
        {transmissionIncertaine && !transmis && <Alert>Une transmission est en attente de vérification. Son résultat est incertain ; aucune nouvelle transmission ne sera effectuée automatiquement.</Alert>}
        {message && <Alert>{message}</Alert>}
        {erreurs.length > 0 && <div id="scan-officiel-erreurs" role="alert" className="text-sm text-ont-red-700"><ul className="list-disc pl-5">{erreurs.map((erreur, index) => <li key={index}>{erreur}</li>)}</ul></div>}
        {!modeReception && (incertain || transmissionIncertaine || message || historiqueDepot || enregistre)
          && <Button type="button" variant="secondary" disabled={Boolean(operation)} loading={operation === 'verification'} onClick={verifier}>Vérifier l’état du document</Button>}
        {peutTransmettre && <Button type="button" disabled={Boolean(operation)} onClick={() => setConfirmationTransmission(true)}>Transmettre à la Réception</Button>}

        {peutDeposer && (
          <form onSubmit={preparer} noValidate className="space-y-4 border-t border-border pt-4">
            <div>
              <label htmlFor="scan-officiel-fichier" className="mb-2 block text-sm font-medium">Scan PDF signé et cacheté (obligatoire)</label>
              <input id="scan-officiel-fichier" type="file" accept="application/pdf,.pdf" className={inputClass}
                disabled={Boolean(operation) || confirmation} aria-invalid={erreurs.length > 0 || undefined}
                aria-describedby={`scan-officiel-aide${erreurs.length ? ' scan-officiel-erreurs' : ''}`} onChange={(event) => {
                  setFichier(event.target.files?.[0] ?? null);
                  setAttestation(false);
                  cle.current = null;
                  setErreurs([]);
                }} />
              <p id="scan-officiel-aide" className="mt-2 text-xs text-text-muted">PDF uniquement, 15 Mo maximum (15 360 Ko). Le serveur vérifie aussi la lisibilité et la qualité du document.</p>
              {fichier && <p className="mt-2 break-all text-sm">Fichier sélectionné : {fichier.name}</p>}
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={attestation} disabled={Boolean(operation) || confirmation} onChange={(event) => setAttestation(event.target.checked)} className="mt-1 shrink-0" />
              <span>{ATTESTATION_SCAN_OFFICIEL} <span className="text-text-muted">(Obligatoire)</span></span>
            </label>
            <Button type="submit" disabled={!fichier || !attestation || Boolean(operation)} loading={operation === 'validation'}>Enregistrer le scan officiel</Button>
          </form>
        )}
        {!secretariat && !agentReception && !enregistre && <p className="text-sm text-text-muted">Le dépôt est réservé au secrétariat de la direction productrice.</p>}
        <ConfirmDialog open={confirmation} title="Enregistrer ce scan officiel ?" description={`Vous confirmez le dépôt de « ${fichier?.name ?? ''} » et votre attestation. Aucun remplacement du scan n’est proposé après enregistrement.`}
          confirmLabel="Confirmer le dépôt" pending={operation === 'depot'} onConfirm={enregistrer} onCancel={() => { if (!verrou.current) setConfirmation(false); }} />
        <ConfirmDialog open={confirmationTransmission} title="Transmettre à la Réception ?" description="Le scan officiel signé et cacheté ainsi que sa référence documentaire seront rendus consultables à la Réception. Cette étape ne crée aucun numéro d’enregistrement et ne permet pas encore la réception dans le circuit central."
          confirmLabel="Confirmer la transmission" pending={operation === 'transmission'} onConfirm={transmettre} onCancel={() => { if (!verrou.current) setConfirmationTransmission(false); }} />
        <Modal open={Boolean(apercu)} onClose={fermerApercu} title={apercu?.scan ? 'Scan officiel signé et cacheté' : 'PDF officiel à imprimer'} size="xl">
          {apercu && <div className="space-y-4">
            <a href={apercu.url} download={`${apercu.scan ? 'scan-officiel' : 'document-interne'}-${documentMetier.id}.pdf`} className="inline-block rounded-field border border-border-strong px-4 py-2 text-sm font-medium focus-visible:outline-2">Télécharger le PDF</a>
            <p className="text-xs text-text-muted">Si votre navigateur ne permet pas l’aperçu, utilisez le téléchargement.</p>
            <iframe src={apercu.url} title={apercu.scan ? 'Aperçu du scan officiel' : 'Aperçu du PDF officiel'} className="h-[65vh] w-full rounded-field border border-border" />
          </div>}
        </Modal>
      </CardBody>
    </Card>
  );
}
