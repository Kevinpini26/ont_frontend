import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRequete } from '../../../shared/hooks/useRequete';
import {
  getTableauRepartition,
  ajouterLignesEnLotTableau,
  retirerLigneTableau,
  soumettreTableau,
  representerDgTableau,
  rendreAvisTableau,
  getDossiersEligibles,
  getMotifsNonRetenu,
} from '../api/tableauxRepartitionApi';
import { listDirections } from '../../kernel/api/directionsApi';
import { useAuthStore } from '../../kernel/store/authStore';
import { ROLES } from '../../kernel/constants';
import { TABLEAU_REPARTITION_STATUT_LABELS } from '../constants';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Badge } from '../../../shared/components/ui/Badge';
import { Alert } from '../../../shared/components/ui/Alert';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';
import { DocumentPreviewModal } from '../../../shared/components/DocumentPreviewModal';
import {
  TableWrap,
  tableClass,
  thClass,
  tbodyClass,
  tdClass,
  tdClassPremiere,
  trHoverClass,
} from '../../../shared/components/ui/Table';

// Pas theadClass (position: sticky) : sur une page courte comme celle-ci
// (peu de contenu au-dessus, table de quelques lignes au plus), l'en-tête
// "collant" se superpose visuellement à la seule ligne du corps du
// tableau au lieu de rester discret — un en-tête fixe n'apporte de toute
// façon rien pour une poignée de lignes, jamais scrollable en pratique.
const theadClassStatique = 'border-b border-border bg-surface text-label font-semibold uppercase tracking-wide text-text-subtle';

const TONE_STATUT = {
  brouillon: 'neutral',
  chez_reception: 'info',
  en_attente_avis_dg: 'warning',
  approuve: 'success',
};

const TONE_AVERTISSEMENT = { quota_atteint: 'danger', quota_proche: 'warning', dates_hors_periode: 'warning', doublon_suspecte: 'warning' };

export function TableauRepartitionDetailPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const { donnees: tableau, setDonnees: setTableau, chargement } = useRequete((signal) => getTableauRepartition(id, signal), [id]);
  const [dossiersEligibles, setDossiersEligibles] = useState([]);
  const [motifsNonRetenu, setMotifsNonRetenu] = useState({});
  const [directions, setDirections] = useState([]);
  // Clé = id du stagiaire, valeur = ses champs de proposition — un seul
  // état pour toute la sélection, un seul geste l'enregistre.
  const [selection, setSelection] = useState({});
  const [avis, setAvis] = useState('favorable');
  const [observations, setObservations] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [apercuPdf, setApercuPdf] = useState(false);

  useEffect(() => {
    listDirections().then(setDirections);
    getMotifsNonRetenu().then(setMotifsNonRetenu);
  }, []);

  useEffect(() => {
    if (tableau?.modifiable) {
      getDossiersEligibles().then(setDossiersEligibles);
    }
  }, [tableau?.modifiable]);

  function basculerSelection(stagiaire, coche) {
    setSelection((s) => {
      const suivant = { ...s };
      if (coche) {
        suivant[stagiaire.id] = {
          directionAccueilProposeeId: '',
          dateDebutProposee: stagiaire.periode_debut_demandee ?? '',
          dateFinProposee: stagiaire.periode_fin_demandee ?? '',
          encadrantPressenti: '',
          issueProposee: 'retenu',
          motifNonRetenu: '',
          motifNonRetenuLibre: '',
        };
      } else {
        delete suivant[stagiaire.id];
      }

      return suivant;
    });
  }

  function modifierSelection(stagiaireId, champ, valeur) {
    setSelection((s) => ({ ...s, [stagiaireId]: { ...s[stagiaireId], [champ]: valeur } }));
  }

  async function executer(action) {
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      const misAJour = await action();
      setTableau(misAJour);
    } catch (err) {
      setErreur(err.response?.data?.message ?? "Action impossible.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function enregistrerSelection(e) {
    e.preventDefault();
    const lignes = Object.entries(selection).map(([stagiaireId, champs]) => ({ stagiaireId, ...champs }));
    await executer(() => ajouterLignesEnLotTableau(id, lignes));
    setSelection({});
    getDossiersEligibles().then(setDossiersEligibles);
  }

  async function soumettreAvis(e) {
    e.preventDefault();
    await executer(() => rendreAvisTableau(id, avis === 'favorable', avis === 'favorable' ? null : observations));
  }

  if (chargement || !tableau) return <LoadingBlock />;

  const peutModifier = tableau.modifiable && user?.role === ROLES.AGENT_DFP;
  const peutSoumettre = tableau.modifiable && user?.role === ROLES.AGENT_DFP && tableau.lignes.length > 0;
  const peutRepresenter = tableau.statut === 'chez_reception' && user?.poste === 'reception';
  const peutRendreAvis = tableau.statut === 'en_attente_avis_dg' && (user?.poste === 'dg' || user?.poste === 'dga');

  return (
    <div>
      <PageHeader title={`Tableau de répartition — ${tableau.periode_debut} au ${tableau.periode_fin}`} description={tableau.direction?.nom} />

      {erreur && <Alert tone="error" className="mb-6">{erreur}</Alert>}

      <Card className="mb-6">
        <CardBody className="space-y-2 text-sm">
          <p>
            <span className="font-medium text-text">Statut : </span>
            <Badge tone={TONE_STATUT[tableau.statut]}>{TABLEAU_REPARTITION_STATUT_LABELS[tableau.statut]}</Badge>
          </p>
          <p className="text-text-muted">
            <span className="font-medium text-text">Rédacteur : </span>{tableau.redacteur}
          </p>
          {tableau.tour > 1 && (
            <Alert tone="warning">Ce tableau boucle : {tableau.tour}ᵉ passage devant la Direction Générale.</Alert>
          )}
          {tableau.avis_dg_commentaire && (
            <p className="text-text-muted">
              <span className="font-medium text-text">Observations du dernier renvoi : </span>{tableau.avis_dg_commentaire}
            </p>
          )}
          {tableau.pdf_disponible && (
            <Button type="button" variant="secondary" onClick={() => setApercuPdf(true)}>
              Voir le PDF
            </Button>
          )}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader title="Demandes regroupées" />
        <CardBody>
          {tableau.lignes.length === 0 ? (
            <p className="text-text-muted">Aucune demande ajoutée.</p>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClassStatique}>
                  <tr>
                    <th className={thClass}>Stagiaire</th>
                    <th className={thClass}>Direction d'accueil proposée</th>
                    <th className={thClass}>Dates proposées</th>
                    <th className={thClass}>Encadrant pressenti</th>
                    <th className={thClass}>Issue proposée</th>
                    <th className={thClass}>Avertissements</th>
                    {peutModifier && <th className={thClass}></th>}
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {tableau.lignes.map((l) => (
                    <tr key={l.id} className={trHoverClass}>
                      <td className={tdClassPremiere}>{l.stagiaire?.nom}</td>
                      <td className={tdClass}>{l.direction_accueil_proposee?.nom}</td>
                      <td className={tdClass}>{l.date_debut_proposee} — {l.date_fin_proposee}</td>
                      <td className={tdClass}>{l.encadrant_pressenti}</td>
                      <td className={tdClass}>
                        <Badge tone={l.issue_proposee === 'retenu' ? 'success' : 'danger'}>{l.issue_proposee_label}</Badge>
                        {l.motif_non_retenu_label && <div className="mt-1 text-xs text-text-subtle">{l.motif_non_retenu_label}</div>}
                      </td>
                      <td className={tdClass}>
                        {l.avertissements?.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {l.avertissements.map((a) => (
                              <Badge key={a.code} tone={TONE_AVERTISSEMENT[a.code] ?? 'warning'}>{a.message}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-text-subtle">—</span>
                        )}
                      </td>
                      {peutModifier && (
                        <td className={tdClass}>
                          <Button size="sm" variant="secondary" disabled={envoiEnCours} onClick={() => executer(() => retirerLigneTableau(id, l.id))}>
                            Retirer
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </CardBody>
      </Card>

      {peutModifier && (
        <Card className="mb-6">
          <CardHeader
            title="Sélection des dossiers"
            description="Dossiers dont le courrier a été orienté vers la DFP par la Direction Générale — rien n'est resaisi, tout vient déjà du dossier."
          />
          <CardBody>
            {dossiersEligibles.length === 0 ? (
              <p className="text-text-muted">Aucun dossier éligible pour le moment.</p>
            ) : (
              <form onSubmit={enregistrerSelection}>
                <TableWrap>
                  <table className={tableClass}>
                    <thead className={theadClassStatique}>
                      <tr>
                        <th className={thClass}></th>
                        <th className={thClass}>Dossier</th>
                        <th className={thClass}>Direction d'accueil proposée</th>
                        <th className={thClass}>Dates proposées</th>
                        <th className={thClass}>Encadrant pressenti</th>
                        <th className={thClass}>Issue</th>
                      </tr>
                    </thead>
                    <tbody className={tbodyClass}>
                      {dossiersEligibles.map((s) => {
                        const champs = selection[s.id];
                        const coche = champs !== undefined;

                        return (
                          <tr key={s.id} className={trHoverClass}>
                            <td className={tdClassPremiere}>
                              <input
                                type="checkbox"
                                checked={coche}
                                onChange={(e) => basculerSelection(s, e.target.checked)}
                                aria-label={`Sélectionner ${s.nom}`}
                              />
                            </td>
                            <td className={tdClass}>
                              {s.nom}
                              <div className="text-xs text-text-subtle">
                                {s.etablissement_origine} · {s.type_stage_label} · demandé du {s.periode_debut_demandee} au {s.periode_fin_demandee}
                                {s.doublon_suspecte && <span className="ml-1 text-ont-red-600">· doublon suspecté</span>}
                              </div>
                            </td>
                            <td className={tdClass}>
                              <select
                                className={inputClass}
                                disabled={!coche}
                                value={champs?.directionAccueilProposeeId ?? ''}
                                onChange={(e) => modifierSelection(s.id, 'directionAccueilProposeeId', e.target.value)}
                                required={coche}
                              >
                                <option value="" disabled>Choisir…</option>
                                {directions.map((d) => (
                                  <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
                                ))}
                              </select>
                            </td>
                            <td className={tdClass}>
                              <div className="flex flex-col gap-1">
                                <input type="date" className={inputClass} disabled={!coche} required={coche}
                                  value={champs?.dateDebutProposee ?? ''} onChange={(e) => modifierSelection(s.id, 'dateDebutProposee', e.target.value)} />
                                <input type="date" className={inputClass} disabled={!coche} required={coche}
                                  value={champs?.dateFinProposee ?? ''} onChange={(e) => modifierSelection(s.id, 'dateFinProposee', e.target.value)} />
                              </div>
                            </td>
                            <td className={tdClass}>
                              <input className={inputClass} disabled={!coche} required={coche}
                                value={champs?.encadrantPressenti ?? ''} onChange={(e) => modifierSelection(s.id, 'encadrantPressenti', e.target.value)} />
                            </td>
                            <td className={tdClass}>
                              <div className="flex flex-col gap-1">
                                <select className={inputClass} disabled={!coche}
                                  value={champs?.issueProposee ?? 'retenu'} onChange={(e) => modifierSelection(s.id, 'issueProposee', e.target.value)}>
                                  <option value="retenu">Retenu</option>
                                  <option value="non_retenu">Non retenu</option>
                                </select>
                                {champs?.issueProposee === 'non_retenu' && (
                                  <select className={inputClass}
                                    value={champs?.motifNonRetenu ?? ''} onChange={(e) => modifierSelection(s.id, 'motifNonRetenu', e.target.value)} required>
                                    <option value="" disabled>Motif…</option>
                                    {Object.entries(motifsNonRetenu).map(([valeur, libelle]) => (
                                      <option key={valeur} value={valeur}>{libelle}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableWrap>
                <div className="mt-4">
                  <Button type="submit" disabled={envoiEnCours || Object.keys(selection).length === 0}>
                    Enregistrer la sélection ({Object.keys(selection).length})
                  </Button>
                </div>
              </form>
            )}
          </CardBody>
        </Card>
      )}

      {peutSoumettre && (
        <Card className="mb-6">
          <CardHeader title="Soumettre le tableau" description="Envoie le tableau à la Réception, en vue de sa présentation à la Direction Générale." />
          <CardBody>
            <Button disabled={envoiEnCours} onClick={() => executer(() => soumettreTableau(id))}>Soumettre</Button>
          </CardBody>
        </Card>
      )}

      {peutRepresenter && (
        <Card className="mb-6">
          <CardHeader title="Représenter à la Direction Générale" />
          <CardBody>
            <Button disabled={envoiEnCours} onClick={() => executer(() => representerDgTableau(id))}>Représenter à la DG</Button>
          </CardBody>
        </Card>
      )}

      {peutRendreAvis && (
        <Card className="mb-6">
          <CardHeader title="Rendre un avis" />
          <CardBody>
            <form onSubmit={soumettreAvis} className="space-y-4">
              <Field label="Avis" htmlFor="avis">
                <select id="avis" className={inputClass} value={avis} onChange={(e) => setAvis(e.target.value)}>
                  <option value="favorable">Approuver en bloc</option>
                  <option value="renvoi">Renvoyer avec observations</option>
                </select>
              </Field>
              {avis === 'renvoi' && (
                <Field label="Observations" htmlFor="observations" required hint="Obligatoire pour un renvoi.">
                  <textarea id="observations" rows={3} className={inputClass} value={observations} onChange={(e) => setObservations(e.target.value)} required />
                </Field>
              )}
              <Button type="submit" disabled={envoiEnCours || (avis === 'renvoi' && !observations.trim())}>
                Valider
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      <DocumentPreviewModal
        open={apercuPdf}
        onClose={() => setApercuPdf(false)}
        title="Tableau de répartition"
        url={apercuPdf ? `/tableaux-repartition/${id}/pdf` : null}
        downloadFilename={`tableau-repartition-${id}`}
      />
    </div>
  );
}
