import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye, FileText, History, Send } from 'lucide-react';
import {
  deciderAutonomeDg,
  getEtatAutonomeDg,
  listDocumentsAutonomesEnAttenteDg,
} from '../api/courrierApi';
import { listDirections } from '../../kernel/api/directionsApi';
import { formaterDateHeure } from '../utils/dateHeure';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { Button } from '../../../shared/components/ui/Button';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Pagination } from '../../../shared/components/ui/Pagination';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { DocumentPreviewModal } from '../../../shared/components/DocumentPreviewModal';

const PREFIXE_DECISION_INCERTAINE = 'ont:dg-document-decision:';

function lireDecisionsIncertaines() {
  try {
    return Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
      .filter((key) => key?.startsWith(PREFIXE_DECISION_INCERTAINE))
      .map((key) => key.slice(PREFIXE_DECISION_INCERTAINE.length));
  } catch {
    return [];
  }
}

function messageErreur(erreur) {
  switch (erreur.response?.status) {
    case 401: return 'Votre session a expiré. Connectez-vous à nouveau.';
    case 403:
    case 404: return 'Vous n’êtes pas autorisé à consulter ou décider ce document.';
    case 409: return 'Le document a déjà changé d’état. Vérifiez son état avant toute nouvelle action.';
    case 422: return erreur.response?.data?.message ?? 'La décision ou la destination ne satisfait pas les règles métier.';
    default: return 'Le résultat de la décision est incertain. Vérifiez son état avant toute nouvelle action.';
  }
}

function nomDirection(document) {
  return document?.courrier?.direction_destination?.nom
    ?? document?.courrier?.dispatchs?.[0]?.direction?.nom
    ?? 'Non déterminée';
}

export function DocumentsAutonomesDgPage() {
  const [page, setPage] = useState(1);
  const [reponse, setReponse] = useState(null);
  const [directions, setDirections] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');
  const [erreurAction, setErreurAction] = useState('');
  const [actionAConfirmer, setActionAConfirmer] = useState(null);
  const [actionEnCours, setActionEnCours] = useState(null);
  const [verificationEnCours, setVerificationEnCours] = useState(null);
  const [actionsIncertaines, setActionsIncertaines] = useState(() => lireDecisionsIncertaines());
  const [decisionVerifiee, setDecisionVerifiee] = useState(null);
  const [apercu, setApercu] = useState(null);
  const verrou = useRef(false);

  const charger = useCallback(async (signal) => {
    setChargement(true);
    setErreurChargement('');
    try {
      const [resultat, directionsDisponibles] = await Promise.all([
        listDocumentsAutonomesEnAttenteDg(page, signal),
        listDirections(),
      ]);
      if (!signal?.aborted) {
        setReponse(resultat);
        setDirections(directionsDisponibles.filter((direction) => direction.actif && direction.est_operationnelle));
      }
    } catch (erreur) {
      if (!signal?.aborted && erreur.code !== 'ERR_CANCELED' && erreur.name !== 'AbortError') {
        setErreurChargement('La file DG/DGA des documents autonomes ne peut pas être chargée.');
      }
    } finally {
      if (!signal?.aborted) setChargement(false);
    }
  }, [page]);

  useEffect(() => {
    const controleur = new AbortController();
    charger(controleur.signal);
    return () => controleur.abort();
  }, [charger]);

  const supprimerDecisionIncertaine = useCallback((id) => {
    try {
      sessionStorage.removeItem(`${PREFIXE_DECISION_INCERTAINE}${id}`);
    } catch {
      setErreurAction('Le navigateur n’a pas pu actualiser le suivi local de cette décision.');
      return false;
    }
    setActionsIncertaines((ids) => ids.filter((incertainId) => String(incertainId) !== String(id)));
    return true;
  }, []);

  async function verifierEtat(id) {
    if (verificationEnCours !== null) return;
    setVerificationEnCours(id);
    setErreurAction('');
    try {
      const document = await getEtatAutonomeDg(id);
      if (!supprimerDecisionIncertaine(id)) return;
      setDecisionVerifiee(document);
      await charger();
    } catch {
      setErreurAction('L’état de la décision ne peut pas encore être vérifié. Aucune nouvelle décision n’a été envoyée.');
    } finally {
      setVerificationEnCours(null);
    }
  }

  async function confirmerDecision() {
    if (verrou.current || !actionAConfirmer) return;
    const { document, payload } = actionAConfirmer;
    verrou.current = true;
    setActionEnCours(document.id);
    setErreurAction('');
    try {
      sessionStorage.setItem(`${PREFIXE_DECISION_INCERTAINE}${document.id}`, 'decision');
      setActionsIncertaines((ids) => ids.includes(String(document.id)) ? ids : [...ids, String(document.id)]);
    } catch {
      setErreurAction('Le stockage de session est indisponible. La décision n’a pas été envoyée.');
      verrou.current = false;
      setActionEnCours(null);
      return;
    }

    try {
      const resultat = await deciderAutonomeDg(document.id, payload);
      if (!supprimerDecisionIncertaine(document.id)) return;
      setDecisionVerifiee(resultat);
      setActionAConfirmer(null);
      await charger();
    } catch (erreur) {
      setErreurAction(messageErreur(erreur));
      setActionAConfirmer(null);
    } finally {
      verrou.current = false;
      setActionEnCours(null);
    }
  }

  const documents = reponse?.data ?? [];
  const directionParId = useMemo(
    () => new Map(directions.map((direction) => [String(direction.id), direction])),
    [directions],
  );

  return (
    <div>
      <PageHeader
        title="Décisions DG/DGA — documents autonomes"
        description="Confirmez ou réorientez la destination des documents transmis par SEC1. Une décision crée un dispatch en attente pour SEC2, sans simuler son exécution."
      />

      {erreurChargement && (
        <Alert tone="error" className="mb-4">
          {erreurChargement}{' '}
          <button type="button" className="font-semibold underline" onClick={() => charger()}>
            Réessayer
          </button>
        </Alert>
      )}
      {erreurAction && <Alert tone="error" className="mb-4">{erreurAction}</Alert>}
      {decisionVerifiee && (
        <Alert tone="success" className="mb-4">
          Décision enregistrée pour {decisionVerifiee.courrier?.reference_documentaire ?? `le document #${decisionVerifiee.id}`}.
          {' '}Destination retenue : {nomDirection(decisionVerifiee)}.
          {decisionVerifiee.courrier?.dispatchs?.[0]?.instruction
            && decisionVerifiee.courrier.dispatchs[0].instruction !== 'Destination souhaitée confirmée par la DG/DGA.'
            && <> Justification : {decisionVerifiee.courrier.dispatchs[0].instruction}.</>}
          {' '}Le dispatch attend son traitement par SEC2.
        </Alert>
      )}
      {actionsIncertaines.length > 0 && (
        <Alert tone="info" className="mb-4">
          Une ou plusieurs réponses de décision sont incertaines. Vérifiez leur état avant toute nouvelle action :
          {' '}{actionsIncertaines.map((id) => (
            <Button
              key={id}
              type="button"
              variant="secondary"
              size="sm"
              className="ml-2"
              disabled={verificationEnCours !== null}
              loading={verificationEnCours === id}
              onClick={() => verifierEtat(id)}
            >
              Vérifier #{id}
            </Button>
          ))}
        </Alert>
      )}

      {chargement ? <LoadingBlock label="Chargement des documents en attente de décision…" /> : documents.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={FileText}
              title="Aucun document en attente de décision"
              description="Les documents autonomes transmis par SEC1 apparaîtront ici après leur prise en charge."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => {
            const courrier = document.courrier;
            const destinationSouhaitee = document.direction_destination_souhaitee;
            const destinationChoisieId = String(document._destinationChoisie ?? destinationSouhaitee?.id ?? '');
            const destinationChoisie = directionParId.get(destinationChoisieId);
            const reorientation = destinationChoisieId !== String(destinationSouhaitee?.id ?? '');
            const motif = document._motifReorientation ?? '';
            const incertain = actionsIncertaines.includes(String(document.id));

            return (
              <Card key={document.id}>
                <CardHeader
                  title={courrier?.objet ?? 'Document sans objet'}
                  description={`${document.direction?.nom ?? courrier?.direction_origine?.nom ?? 'Direction d’origine inconnue'} · ${courrier?.reference_documentaire ?? 'Référence indisponible'}`}
                  action={<Badge tone="warning">En attente DG/DGA</Badge>}
                />
                <CardBody className="space-y-4">
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-text-muted">Numéro d’enregistrement</dt><dd className="font-medium">{courrier?.numero_enregistrement ?? 'Indisponible'}</dd></div>
                    <div><dt className="text-text-muted">Destination souhaitée</dt><dd className="font-medium">{destinationSouhaitee?.nom ?? 'Non renseignée'}</dd></div>
                    <div><dt className="text-text-muted">Transmis par SEC1</dt><dd>{formaterDateHeure(courrier?.transitions?.find((transition) => transition.nouveau_statut === 'en_attente_avis_dg')?.created_at)}</dd></div>
                    <div><dt className="text-text-muted">Destination retenue</dt><dd className="font-medium">{document.courrier?.dispatchs?.[0]?.direction?.nom ?? 'À décider'}</dd></div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setApercu({
                        title: `Document officiel — ${courrier?.reference_documentaire ?? `#${document.id}`}`,
                        url: `/documents-produits-direction/${document.id}/pdf-officiel`,
                        downloadFilename: `document-officiel-${document.id}.pdf`,
                      })}
                    >
                      <Eye size={16} /> Consulter le PDF officiel
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setApercu({
                        title: `Scan signé et cacheté — ${courrier?.reference_documentaire ?? `#${document.id}`}`,
                        url: `/documents-produits-direction/${document.id}/scan-officiel`,
                        downloadFilename: `scan-officiel-${document.id}.pdf`,
                      })}
                    >
                      <Eye size={16} /> Consulter le scan
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Direction destinataire
                      <select
                        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2"
                        value={destinationChoisieId}
                        onChange={(event) => {
                          const value = event.target.value;
                          setReponse((current) => ({
                            ...current,
                            data: current.data.map((item) => String(item.id) === String(document.id)
                              ? { ...item, _destinationChoisie: value }
                              : item),
                          }));
                        }}
                      >
                        {directions.map((direction) => (
                          <option key={direction.id} value={direction.id}>{direction.nom}</option>
                        ))}
                      </select>
                    </label>
                    {reorientation && (
                      <label className="block text-sm font-medium">
                        Justification obligatoire
                        <textarea
                          className="mt-1 block min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2"
                          maxLength={2000}
                          value={motif}
                          onChange={(event) => {
                            const value = event.target.value;
                            setReponse((current) => ({
                              ...current,
                              data: current.data.map((item) => String(item.id) === String(document.id)
                                ? { ...item, _motifReorientation: value }
                                : item),
                            }));
                          }}
                          required
                        />
                      </label>
                    )}
                  </div>

                  {incertain ? (
                    <Alert tone="info">
                      La réponse précédente est incertaine. Vérifiez l’état du document avant de décider à nouveau.
                      <Button type="button" variant="secondary" size="sm" className="ml-2" disabled={verificationEnCours !== null} loading={verificationEnCours === document.id} onClick={() => verifierEtat(document.id)}>
                        Vérifier l’état
                      </Button>
                    </Alert>
                  ) : (
                    <Button
                      type="button"
                      disabled={actionEnCours !== null || !destinationChoisie || (reorientation && !motif.trim())}
                      loading={actionEnCours === document.id}
                      onClick={() => setActionAConfirmer({
                        document,
                        payload: {
                          direction_id: Number(destinationChoisieId),
                          ...(reorientation ? { motif_reorientation: motif.trim() } : {}),
                        },
                        destination: destinationChoisie,
                        reorientation,
                      })}
                    >
                      <Send size={17} /> Confirmer la décision
                    </Button>
                  )}

                  {document.historique?.length > 0 && (
                    <details className="border-t border-border pt-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <History size={16} /> Historique du parcours ({document.historique.length})
                      </summary>
                      <ol className="mt-3 space-y-2 text-sm">
                        {document.historique.map((evenement, index) => (
                          <li key={`${evenement.action}-${evenement.date}-${index}`}>
                            <span className="font-medium">{evenement.action.replaceAll('_', ' ')}</span>
                            {' · '}{evenement.acteur?.name ?? 'Acteur non renseigné'}
                            {' · '}{formaterDateHeure(evenement.date)}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </CardBody>
              </Card>
            );
          })}
          <Pagination meta={reponse?.meta} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(actionAConfirmer)}
        title="Confirmer la décision DG/DGA ?"
        description={actionAConfirmer?.reorientation
          ? `Le document sera orienté vers ${actionAConfirmer?.destination?.nom ?? 'la direction choisie'} pour traitement par SEC2. Votre justification sera conservée dans l’historique.`
          : `La destination souhaitée (${actionAConfirmer?.destination?.nom ?? 'direction'}) sera confirmée et le document rendu disponible à SEC2. Cette décision ne simule ni prise en charge ni expédition.`}
        confirmLabel="Confirmer et transmettre à SEC2"
        pending={actionEnCours !== null}
        onConfirm={confirmerDecision}
        onCancel={() => { if (actionEnCours === null) setActionAConfirmer(null); }}
      />
      <DocumentPreviewModal
        open={Boolean(apercu)}
        onClose={() => setApercu(null)}
        title={apercu?.title}
        url={apercu?.url}
        downloadFilename={apercu?.downloadFilename}
      />
    </div>
  );
}
