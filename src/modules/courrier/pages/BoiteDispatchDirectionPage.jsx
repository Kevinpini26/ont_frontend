import { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { accuserReceptionDispatch, listBoiteDispatchDirection, transmettreTraitementDirecteur } from '../api/courrierApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { Alert } from '../../../shared/components/ui/Alert';
import { DocumentPreviewModal } from '../../../shared/components/DocumentPreviewModal';

function dateReception(valeur) {
  return valeur ? new Date(valeur).toLocaleString('fr-FR') : '—';
}

export function BoiteDispatchDirectionPage() {
  const [dispatchs, setDispatchs] = useState(null);
  const [notes, setNotes] = useState({});
  const [erreur, setErreur] = useState('');
  const [actionEnCours, setActionEnCours] = useState(null);
  const [apercu, setApercu] = useState(null);

  const charger = useCallback(async () => {
    try {
      setDispatchs(await listBoiteDispatchDirection());
      setErreur('');
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'La boîte de réception de la direction ne peut pas être chargée.');
    }
  }, []);

  useEffect(() => { charger(); }, [charger]);

  async function confirmerReception(dispatch) {
    setActionEnCours(dispatch.id);
    setErreur('');
    try {
      await accuserReceptionDispatch(dispatch.id);
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'La réception n’a pas pu être confirmée. Vérifiez l’état du dispatch.');
    } finally {
      setActionEnCours(null);
    }
  }

  async function transmettreAuDirecteur(dispatch) {
    setActionEnCours(dispatch.id);
    setErreur('');
    try {
      await transmettreTraitementDirecteur(dispatch.traitement_direction.id, notes[dispatch.id]);
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'La transmission au Directeur n’a pas pu être confirmée.');
    } finally {
      setActionEnCours(null);
    }
  }

  if (!dispatchs) return <LoadingBlock />;

  return (
    <div>
      <PageHeader
        title="Courriers reçus par la direction"
        description="Les transmissions SEC2 apparaissent ici sans être acquittées automatiquement par la direction."
      />
      {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}
      {dispatchs.length === 0 ? (
        <EmptyState title="Aucun courrier dispatché" />
      ) : (
        <div className="space-y-4">
          {dispatchs.map((dispatch) => {
            const autonome = Boolean(dispatch.document_autonome);
            return (
              <Card key={dispatch.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link className="font-semibold text-primary hover:underline" to={`/courriers/${dispatch.courrier_id}`}>
                        {dispatch.courrier?.objet}
                      </Link>
                      <p className="text-sm text-text-subtle">
                        {dispatch.courrier?.numero_enregistrement ?? '—'} · Provenance {dispatch.courrier?.direction_origine ?? 'SEC2'}
                      </p>
                      {autonome && (
                        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                          <div><dt className="text-text-subtle">Référence officielle</dt><dd>{dispatch.courrier?.reference_documentaire ?? '—'}</dd></div>
                          <div><dt className="text-text-subtle">Direction destinataire</dt><dd>{dispatch.courrier?.direction_destination ?? dispatch.direction?.nom ?? '—'}</dd></div>
                          <div><dt className="text-text-subtle">Décision DG/DGA</dt><dd>{dispatch.decisionnaire?.name ?? '—'} · {dispatch.decisionnaire_poste ?? dispatch.autorite_poste}</dd></div>
                          <div><dt className="text-text-subtle">Transmis par SEC2 le</dt><dd>{dispatch.execute_at ? new Date(dispatch.execute_at).toLocaleString('fr-FR') : '—'}</dd></div>
                        </dl>
                      )}
                      <p className="mt-2 text-sm">{dispatch.instruction}</p>
                    </div>
                    {dispatch.accuse_reception_at ? (
                      <Badge tone="success">{dispatch.traitement_direction?.statut_label ?? 'Réception confirmée'}</Badge>
                    ) : (
                      <div className="flex flex-col items-start gap-2">
                        <Badge tone="warning">Transmis — réception à confirmer</Badge>
                        {dispatch.peut_accuser_reception && (
                          <Button
                            type="button"
                            disabled={actionEnCours !== null}
                            loading={actionEnCours === dispatch.id}
                            onClick={() => confirmerReception(dispatch)}
                          >
                            Confirmer la réception
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {autonome && (
                    <>
                      <dl className="grid gap-2 border-t border-border pt-3 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="text-text-subtle">Décision DG/DGA</dt>
                          <dd>{dispatch.decisionnaire?.name ?? '—'} · {dateReception(dispatch.decide_at)}</dd>
                        </div>
                        <div>
                          <dt className="text-text-subtle">Transmission SEC2</dt>
                          <dd>{dispatch.execute_par?.name ?? '—'} · {dateReception(dispatch.execute_at)}</dd>
                        </div>
                        <div>
                          <dt className="text-text-subtle">Réception par la direction</dt>
                          <dd>
                            {dispatch.accuse_reception_at
                              ? `${dispatch.accuse_reception_par?.name ?? 'Agent habilité'} · ${dateReception(dispatch.accuse_reception_at)}`
                              : 'En attente d’un accusé explicite'}
                          </dd>
                        </div>
                      </dl>
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
                    </>
                  )}
                  {dispatch.traitement_direction?.statut === 'recu_secretariat' && (
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="min-w-64 flex-1 text-sm">
                        Note au Directeur
                        <input
                          className="mt-1 w-full rounded-field border border-border bg-surface px-3 py-2"
                          value={notes[dispatch.id] ?? ''}
                          onChange={(event) => setNotes((actuelles) => ({ ...actuelles, [dispatch.id]: event.target.value }))}
                        />
                      </label>
                      <Button
                        type="button"
                        disabled={actionEnCours !== null}
                        loading={actionEnCours === dispatch.id}
                        onClick={() => transmettreAuDirecteur(dispatch)}
                      >
                        Transmettre au Directeur
                      </Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
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
