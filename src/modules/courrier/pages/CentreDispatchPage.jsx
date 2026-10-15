import { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, Hand, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { accuserReception, executerDispatch, getDispatch, listCentreDispatchPage } from '../api/courrierApi';
import { Pagination } from '../../../shared/components/ui/Pagination';
import { Alert } from '../../../shared/components/ui/Alert';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { ConfirmDialog } from '../../../shared/components/ui/ConfirmDialog';
import { DocumentPreviewModal } from '../../../shared/components/DocumentPreviewModal';

const PREFIXE_ACTION_INCERTAINE = 'ont:sec2-dispatch-action:';

function messageErreur(erreur, action) {
  switch (erreur.response?.status) {
    case 401: return 'Votre session a expiré. Connectez-vous à nouveau.';
    case 403:
    case 404: return 'Vous n’êtes pas autorisé à consulter ou traiter ce dispatch.';
    case 409:
    case 422: return 'Le dispatch a changé d’état ou ne peut pas être traité. Vérifiez son état avant toute nouvelle action.';
    default: return `Le résultat de ${action} est incertain. Vérifiez l’état avant toute nouvelle action.`;
  }
}

function lireTransitionSec2(dispatch) {
  return dispatch.courrier?.transitions?.find((transition) =>
    transition.nouveau_statut === 'en_dispatch'
      && transition.destinataire_poste === 'secretariat_2',
  );
}

export function CentreDispatchPage() {
  const [dispatchs, setDispatchs] = useState(null);
  const [saisie, setSaisie] = useState({});
  const [actionAConfirmer, setActionAConfirmer] = useState(null);
  const [actionEnCours, setActionEnCours] = useState(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('direction');
  const [statut, setStatut] = useState('en_attente');
  const [meta, setMeta] = useState(null);
  const [erreur, setErreur] = useState('');
  const [actionsIncertaines, setActionsIncertaines] = useState({});
  const [apercu, setApercu] = useState(null);
  const verrou = useRef(false);

  const charger = useCallback(async () => {
    try {
      const resultat = await listCentreDispatchPage({ page, type, statut });
      setDispatchs(resultat.data);
      setMeta(resultat.meta);
      setErreur('');
      return resultat.data;
    } catch (err) {
      setErreur(err.response?.status === 401
        ? 'Votre session a expiré. Connectez-vous à nouveau.'
        : err.response?.status === 403
          ? 'Vous n’êtes pas autorisé à consulter le centre de dispatch.'
          : 'Impossible de charger les dispatchs. Réessayez.');
      return null;
    }
  }, [page, type, statut]);

  useEffect(() => {
    try {
      const incertaines = {};
      for (let index = 0; index < sessionStorage.length; index += 1) {
        const cle = sessionStorage.key(index);
        if (cle?.startsWith(PREFIXE_ACTION_INCERTAINE)) {
          incertaines[cle.slice(PREFIXE_ACTION_INCERTAINE.length)] = sessionStorage.getItem(cle);
        }
      }
      setActionsIncertaines(incertaines);
    } catch {
      setErreur('Le stockage de session est indisponible ; les actions ne seront pas renvoyées automatiquement.');
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  function retirerActionIncertaine(id) {
    try {
      sessionStorage.removeItem(`${PREFIXE_ACTION_INCERTAINE}${id}`);
    } catch {
      setErreur('L’état local de vérification n’a pas pu être actualisé. Aucune action ne sera renvoyée.');
      return false;
    }
    setActionsIncertaines((actuelles) => {
      const suivantes = { ...actuelles };
      delete suivantes[id];
      return suivantes;
    });
    return true;
  }

  async function verifierEtat(dispatch) {
    setErreur('');
    try {
      const resultat = await getDispatch(dispatch.id);
      const etapeIncertaine = actionsIncertaines[dispatch.id];
      const priseEnChargeConfirmee = resultat.document_autonome?.prise_en_charge_sec2 !== null
        && resultat.document_autonome?.prise_en_charge_sec2 !== undefined;
      const transmissionConfirmee = resultat.statut === 'execute';
      const actionConfirmee = etapeIncertaine === 'prise_en_charge'
        ? priseEnChargeConfirmee
        : transmissionConfirmee;

      if (!retirerActionIncertaine(dispatch.id)) return;
      setErreur(actionConfirmee
        ? 'L’action est confirmée par le serveur.'
        : 'Le serveur confirme que l’action n’a pas abouti. Vous pouvez décider de la reprendre.');
      await charger();
    } catch (err) {
      setErreur(messageErreur(err, 'la vérification'));
    }
  }

  async function executerAction() {
    if (verrou.current || !actionAConfirmer) return;

    const { type: typeAction, dispatch } = actionAConfirmer;
    const action = typeAction === 'prise_en_charge' ? 'prise_en_charge' : 'transmission';
    verrou.current = true;
    setActionEnCours(dispatch.id);
    setErreur('');

    try {
      sessionStorage.setItem(`${PREFIXE_ACTION_INCERTAINE}${dispatch.id}`, action);
      setActionsIncertaines((actuelles) => ({ ...actuelles, [dispatch.id]: action }));
    } catch {
      setErreur('Le stockage de session est indisponible. L’action n’a pas été envoyée.');
      verrou.current = false;
      setActionEnCours(null);
      return;
    }

    try {
      if (typeAction === 'prise_en_charge') {
        await accuserReception(dispatch.courrier_id);
      } else {
        await executerDispatch(dispatch.id, saisie[dispatch.id]?.reference, saisie[dispatch.id]?.preuve);
      }

      if (!retirerActionIncertaine(dispatch.id)) return;
      setActionAConfirmer(null);
      await charger();
    } catch (err) {
      setErreur(messageErreur(err, action === 'prise_en_charge' ? 'la prise en charge' : 'la transmission'));
      setActionAConfirmer(null);
    } finally {
      verrou.current = false;
      setActionEnCours(null);
    }
  }

  async function executerHistorique(dispatch) {
    setActionEnCours(dispatch.id);
    setErreur('');
    try {
      await executerDispatch(dispatch.id, saisie[dispatch.id]?.reference, saisie[dispatch.id]?.preuve);
      await charger();
    } catch (err) {
      setErreur(messageErreur(err, 'la transmission'));
    } finally {
      setActionEnCours(null);
    }
  }

  if (!dispatchs && !erreur) return <LoadingBlock />;

  return (
    <div>
      <PageHeader
        title="Centre de dispatch SEC2"
        description="Prise en charge des décisions DG/DGA, puis transmission explicite à la direction destinataire."
      />
      {erreur && (
        <Alert tone="error" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{erreur}</span>
            <Button disabled={actionEnCours !== null} onClick={charger}>Réessayer</Button>
          </div>
        </Alert>
      )}
      <div className="mb-4 flex flex-wrap gap-3">
        <select aria-label="Type de dispatch" className={inputClass} value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}>
          <option value="direction">Dispatch interne</option>
          <option value="exterieur">Transmission externe historique</option>
          <option value="classement">Classement</option>
        </select>
        <select aria-label="État des dispatchs" className={inputClass} value={statut} onChange={(event) => { setStatut(event.target.value); setPage(1); }}>
          <option value="en_attente">À exécuter</option>
          <option value="execute">Historique exécuté</option>
          <option value="annule">Annulés</option>
        </select>
      </div>
      {dispatchs && dispatchs.length === 0 ? (
        <EmptyState title="Aucun dispatch" />
      ) : dispatchs && (
        <div className="space-y-4">
          {dispatchs.map((dispatch) => {
            const autonome = Boolean(dispatch.document_autonome);
            const transitionSec2 = autonome ? lireTransitionSec2(dispatch) : null;
            const prisEnCharge = autonome && transitionSec2?.accuse_reception_at;
            const incertain = Boolean(actionsIncertaines[dispatch.id]);

            return (
              <Card key={dispatch.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <Link className="font-semibold text-primary hover:underline" to={`/courriers/${dispatch.courrier_id}`}>
                        {dispatch.courrier?.objet}
                      </Link>
                      <p className="text-sm text-text-subtle">
                        {dispatch.type_destination_label} — {dispatch.direction?.nom ?? dispatch.destinataire_externe_nom ?? 'Classement'}
                      </p>
                    </div>
                    <Badge tone={dispatch.statut === 'execute' ? 'success' : 'warning'}>{dispatch.statut_label}</Badge>
                  </div>
                  {autonome && (
                    <section className="rounded-field border border-border bg-surface-sunken p-3" aria-label="Informations du document autonome">
                      <p className="font-semibold">Document autonome décidé par la DG/DGA</p>
                      <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                        <div><dt className="text-text-subtle">Référence documentaire</dt><dd>{dispatch.courrier?.reference_documentaire ?? '—'}</dd></div>
                        <div><dt className="text-text-subtle">Numéro d’enregistrement</dt><dd>{dispatch.courrier?.numero_enregistrement ?? '—'}</dd></div>
                        <div><dt className="text-text-subtle">Direction productrice</dt><dd>{dispatch.courrier?.direction_origine ?? '—'}</dd></div>
                        <div><dt className="text-text-subtle">Direction destinataire</dt><dd>{dispatch.courrier?.direction_destination ?? dispatch.direction?.nom ?? '—'}</dd></div>
                        <div><dt className="text-text-subtle">Décisionnaire</dt><dd>{dispatch.decisionnaire?.name ?? 'DG/DGA'} · {dispatch.decisionnaire_poste ?? dispatch.autorite_poste}</dd></div>
                        <div><dt className="text-text-subtle">Décision rendue le</dt><dd>{dispatch.decide_at ? new Date(dispatch.decide_at).toLocaleString('fr-FR') : '—'}</dd></div>
                      </dl>
                      <p className="mt-2 text-sm"><span className="font-medium">Instruction DG/DGA :</span> {dispatch.instruction}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setApercu({
                            title: 'Scan officiel signé et cacheté',
                            url: `/dispatchs/${dispatch.id}/scan-officiel`,
                            downloadFilename: `scan-officiel-${dispatch.id}.pdf`,
                          })}
                        >
                          <Eye size={16} /> Consulter le scan officiel
                        </Button>
                        {prisEnCharge && (
                          <span className="text-sm text-text-muted">
                            Pris en charge par {transitionSec2.accuse_reception_par ?? 'SEC2'} le {new Date(transitionSec2.accuse_reception_at).toLocaleString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </section>
                  )}
                  {!autonome && <p className="text-sm"><span className="font-medium">Instruction :</span> {dispatch.instruction}</p>}
                  {incertain && (
                    <Alert tone="warning">
                      Le résultat de la dernière action est incertain. Aucune action ne sera renvoyée automatiquement.
                      <div className="mt-2">
                        <Button type="button" variant="secondary" size="sm" disabled={actionEnCours !== null} onClick={() => verifierEtat(dispatch)}>
                          Vérifier l’état
                        </Button>
                      </div>
                    </Alert>
                  )}
                  {dispatch.statut === 'en_attente' && dispatch.type_destination === 'classement' && <Link to="/circuit/classement-archives">Classer</Link>}
                  {dispatch.statut === 'en_attente' && autonome && !incertain && (
                    <Button
                      type="button"
                      disabled={actionEnCours !== null}
                      loading={actionEnCours === dispatch.id}
                      onClick={() => setActionAConfirmer({ type: prisEnCharge ? 'transmission' : 'prise_en_charge', dispatch })}
                    >
                      {prisEnCharge ? <Send size={16} /> : <Hand size={16} />}
                      {prisEnCharge ? 'Confirmer la transmission à la direction' : 'Prendre en charge'}
                    </Button>
                  )}
                  {dispatch.statut === 'en_attente' && !autonome && dispatch.type_destination !== 'classement' && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Référence de transmission">
                        <input
                          className={inputClass}
                          value={saisie[dispatch.id]?.reference ?? ''}
                          onChange={(event) => setSaisie((actuelles) => ({
                            ...actuelles,
                            [dispatch.id]: { ...actuelles[dispatch.id], reference: event.target.value },
                          }))}
                        />
                      </Field>
                      <Field label="Preuve (PDF ou image)">
                        <input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png"
                          className={inputClass}
                          onChange={(event) => setSaisie((actuelles) => ({
                            ...actuelles,
                            [dispatch.id]: { ...actuelles[dispatch.id], preuve: event.target.files?.[0] },
                          }))}
                        />
                      </Field>
                      <Button
                        type="button"
                        loading={actionEnCours === dispatch.id}
                        disabled={actionEnCours !== null || (dispatch.type_destination === 'exterieur' && !saisie[dispatch.id]?.reference && !saisie[dispatch.id]?.preuve)}
                        onClick={() => executerHistorique(dispatch)}
                      >
                        Marquer exécuté
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
      <Pagination meta={meta} onPageChange={setPage} />
      <ConfirmDialog
        open={Boolean(actionAConfirmer)}
        title={actionAConfirmer?.type === 'prise_en_charge' ? 'Confirmer la prise en charge SEC2 ?' : 'Confirmer la transmission à la direction ?'}
        description={actionAConfirmer?.type === 'prise_en_charge'
          ? 'Votre accusé de prise en charge sera tracé. Le document ne sera pas encore marqué comme reçu par la direction destinataire.'
          : 'Le dispatch sera transmis à la direction choisie par la DG/DGA. La direction devra confirmer sa réception séparément.'}
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
