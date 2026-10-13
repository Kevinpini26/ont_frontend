import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, FileText, Hand, Send } from 'lucide-react';
import {
  getEtatAutonomeSec1,
  listDocumentsAutonomesAcceptesSec1,
  prendreEnChargeAutonomeSec1,
  transmettreAutonomeDgDepuisSec1,
} from '../api/courrierApi';
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

const PREFIXE_ACTION_INCERTAINE = 'ont:sec1-document-action:';

function lireActionsIncertaines() {
  try {
    return Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
      .filter((key) => key?.startsWith(PREFIXE_ACTION_INCERTAINE))
      .map((key) => key.slice(PREFIXE_ACTION_INCERTAINE.length));
  } catch {
    return [];
  }
}

function transitionReceptionSec1(courrier) {
  return courrier?.transitions?.find((transition) =>
    transition.nouveau_statut === 'recu' && transition.destinataire_poste === 'secretariat_1',
  );
}

function transitionTransmissionDg(courrier) {
  return courrier?.transitions?.find((transition) => transition.nouveau_statut === 'en_attente_avis_dg');
}

function messageErreurAction(erreur) {
  switch (erreur.response?.status) {
    case 401: return 'Votre session a expiré. Connectez-vous à nouveau.';
    case 403:
    case 404: return 'Vous n’êtes pas autorisé à agir sur ce document ou il n’est plus accessible.';
    case 409: return 'Le document a déjà changé d’état. Vérifiez son état avant toute nouvelle action.';
    case 422: return erreur.response?.data?.message ?? 'Le document ne satisfait pas les conditions de cette action.';
    default: return 'Le résultat de l’action est incertain. Vérifiez l’état du document avant toute nouvelle action.';
  }
}

export function DocumentsAutonomesSec1Page() {
  const [page, setPage] = useState(1);
  const [reponse, setReponse] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');
  const [erreurAction, setErreurAction] = useState('');
  const [actionAConfirmer, setActionAConfirmer] = useState(null);
  const [actionEnCours, setActionEnCours] = useState(null);
  const [verificationEnCours, setVerificationEnCours] = useState(null);
  const [actionsIncertaines, setActionsIncertaines] = useState(() => lireActionsIncertaines());
  const [apercu, setApercu] = useState(null);
  const verrou = useRef(false);

  const charger = useCallback(async (signal) => {
    setChargement(true);
    setErreurChargement('');
    try {
      const resultat = await listDocumentsAutonomesAcceptesSec1(page, signal);
      if (!signal?.aborted) setReponse(resultat);
    } catch (erreur) {
      if (!signal?.aborted && erreur.code !== 'ERR_CANCELED' && erreur.name !== 'AbortError') {
        setErreurChargement('La file SEC1 des documents autonomes ne peut pas être chargée.');
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

  const retirerActionIncertaine = useCallback((id) => {
    try {
      sessionStorage.removeItem(`${PREFIXE_ACTION_INCERTAINE}${id}`);
    } catch {
      setErreurAction('Le navigateur n’a pas pu actualiser l’état local de vérification.');
      return false;
    }
    setActionsIncertaines((ids) => ids.filter((incertainId) => String(incertainId) !== String(id)));
    return true;
  }, []);

  async function actualiserDocument(id) {
    if (verificationEnCours !== null) return;
    setVerificationEnCours(id);
    setErreurAction('');
    try {
      const document = await getEtatAutonomeSec1(id);
      if (!retirerActionIncertaine(id)) return;
      setReponse((courant) => courant && ({
        ...courant,
        data: courant.data.map((element) => String(element.id) === String(id) ? document : element),
      }));
      await charger();
    } catch {
      setErreurAction('L’état du document ne peut pas encore être vérifié. Aucune action n’a été renvoyée.');
    } finally {
      setVerificationEnCours(null);
    }
  }

  async function executerAction() {
    if (verrou.current || !actionAConfirmer) return;
    const { type, document } = actionAConfirmer;
    verrou.current = true;
    setActionEnCours(document.id);
    setErreurAction('');

    try {
      sessionStorage.setItem(`${PREFIXE_ACTION_INCERTAINE}${document.id}`, type);
      setActionsIncertaines((ids) => ids.includes(String(document.id)) ? ids : [...ids, String(document.id)]);
    } catch {
      setErreurAction('Le stockage de session est indisponible. L’action n’a pas été envoyée.');
      verrou.current = false;
      setActionEnCours(null);
      return;
    }

    try {
      const misAJour = type === 'prise_en_charge'
        ? await prendreEnChargeAutonomeSec1(document.id)
        : await transmettreAutonomeDgDepuisSec1(document.id);
      if (!retirerActionIncertaine(document.id)) return;
      setReponse((courant) => courant && ({
        ...courant,
        data: courant.data.map((element) => String(element.id) === String(document.id) ? misAJour : element),
      }));
      setActionAConfirmer(null);
      await charger();
    } catch (erreur) {
      setErreurAction(messageErreurAction(erreur));
      setActionAConfirmer(null);
    } finally {
      verrou.current = false;
      setActionEnCours(null);
    }
  }

  const documents = reponse?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Documents autonomes acceptés"
        description="Prise en charge SEC1 et transmission explicite à la Direction Générale. Le PDF officiel et le scan restent consultables en privé."
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

      {chargement ? <LoadingBlock label="Chargement des documents acceptés par la Réception…" /> : documents.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={FileText}
              title="Aucun document autonome accepté"
              description="Les documents acceptés par la Réception apparaîtront ici avec leur numéro d’enregistrement."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => {
            const courrier = document.courrier;
            const priseEnCharge = transitionReceptionSec1(courrier);
            const transmissionDg = transitionTransmissionDg(courrier);
            const incertain = actionsIncertaines.includes(String(document.id));
            const enAttenteSec1 = courrier?.statut === 'recu';

            return (
              <Card key={document.id}>
                <CardHeader
                  title={courrier?.objet ?? 'Document sans objet'}
                  description={`${document.direction?.nom ?? courrier?.direction_origine?.nom ?? 'Direction non renseignée'} · Référence ${courrier?.reference_documentaire ?? 'indisponible'}`}
                  action={<Badge tone={enAttenteSec1 ? 'warning' : 'info'}>{enAttenteSec1 ? 'À traiter par SEC1' : 'Transmis à la DG'}</Badge>}
                />
                <CardBody className="space-y-4">
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    <div><dt className="text-xs text-text-subtle">Numéro d’enregistrement</dt><dd className="font-semibold">{courrier?.numero_enregistrement ?? '—'}</dd></div>
                    <div><dt className="text-xs text-text-subtle">Direction productrice</dt><dd>{document.direction?.nom ?? courrier?.direction_origine?.nom ?? '—'}</dd></div>
                    <div><dt className="text-xs text-text-subtle">Destination souhaitée</dt><dd>{document.direction_destination_souhaitee?.nom ?? 'Direction Générale'}</dd></div>
                    <div><dt className="text-xs text-text-subtle">Accepté par la Réception</dt><dd>{document.recu_par?.name ?? '—'} · {document.recu_at ? formaterDateHeure(document.recu_at) : '—'}</dd></div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setApercu({
                        title: 'Document officiel validé',
                        url: `/documents-produits-direction/${document.id}/pdf-officiel`,
                        downloadFilename: `document-interne-${document.id}.pdf`,
                      })}
                    >
                      <Eye size={17} /> Voir le document officiel
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setApercu({
                        title: 'Scan signé et cacheté',
                        url: `/documents-produits-direction/${document.id}/scan-officiel`,
                        downloadFilename: `scan-officiel-${document.id}.pdf`,
                      })}
                    >
                      <Eye size={17} /> Consulter le scan signé et cacheté
                    </Button>
                  </div>

                  <section aria-label="Historique SEC1 et DG" className="rounded-field border border-border bg-surface-sunken p-4">
                    <h3 className="text-sm font-semibold">Historique des opérations</h3>
                    <ul className="mt-2 space-y-1 text-sm text-text-muted">
                      <li>Accepté par la Réception : {document.recu_par?.name ?? '—'} · {document.recu_at ? formaterDateHeure(document.recu_at) : '—'}</li>
                      {priseEnCharge?.accuse_reception_at && (
                        <li>Pris en charge par SEC1 : {priseEnCharge.accuse_reception_par ?? '—'} · {formaterDateHeure(priseEnCharge.accuse_reception_at)}</li>
                      )}
                      {transmissionDg && (
                        <li>Transmis à la DG par {transmissionDg.emetteur ?? 'SEC1'} · {formaterDateHeure(transmissionDg.created_at)}</li>
                      )}
                    </ul>
                  </section>

                  {incertain && (
                    <Alert tone="warning">
                      Le résultat de la dernière action est incertain. Vérifiez l’état du document ; aucune action ne sera renvoyée automatiquement.
                      <div className="mt-2">
                        <Button type="button" variant="secondary" size="sm" disabled={verificationEnCours !== null} loading={verificationEnCours === document.id} onClick={() => actualiserDocument(document.id)}>
                          Vérifier l’état
                        </Button>
                      </div>
                    </Alert>
                  )}

                  {!incertain && enAttenteSec1 && !priseEnCharge?.accuse_reception_at && (
                    <Button type="button" disabled={actionEnCours !== null} loading={actionEnCours === document.id} onClick={() => setActionAConfirmer({ type: 'prise_en_charge', document })}>
                      <Hand size={17} /> Prendre en charge
                    </Button>
                  )}
                  {!incertain && enAttenteSec1 && priseEnCharge?.accuse_reception_at && (
                    <Button type="button" disabled={actionEnCours !== null} loading={actionEnCours === document.id} onClick={() => setActionAConfirmer({ type: 'transmettre_dg', document })}>
                      <Send size={17} /> Transmettre à la DG
                    </Button>
                  )}
                  {!enAttenteSec1 && <p className="text-sm text-text-muted">Le document est dans la file DG en attente d’une décision. Aucune décision n’a été prise automatiquement.</p>}
                </CardBody>
              </Card>
            );
          })}
          <Pagination meta={reponse?.meta} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(actionAConfirmer)}
        title={actionAConfirmer?.type === 'prise_en_charge' ? 'Confirmer la prise en charge ?' : 'Transmettre à la Direction Générale ?'}
        description={actionAConfirmer?.type === 'prise_en_charge'
          ? 'La prise en charge sera enregistrée avec votre identité et la date, sans modifier le document signé.'
          : 'Le document sera placé dans la file DG pour décision. Cette action ne simule ni ne préjuge une décision de la DG.'}
        confirmLabel={actionAConfirmer?.type === 'prise_en_charge' ? 'Confirmer la prise en charge' : 'Confirmer la transmission'}
        pending={actionEnCours !== null}
        onConfirm={executerAction}
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
