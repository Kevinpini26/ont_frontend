import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams, Link } from 'react-router-dom';
import {
  accuserReception,
  accuserReceptionBordereauLot,
  bordereauLotPdfUrl,
  creerBordereauLot,
  createCourrier,
  initierCourrierDg,
  listCourriers,
} from '../api/courrierApi';
import { DocumentPreviewModal } from '../../../shared/components/DocumentPreviewModal';
import { useRequete } from '../../../shared/hooks/useRequete';
import { ACTION_PAR_POSTE, DEGRE_URGENCE_LABELS, ORDRE_URGENCE, STATUT_LABELS, TONE_URGENCE, TYPE_LABELS } from '../constants';
import { SearchBar } from '../../../shared/components/SearchBar';
import { useAuthStore } from '../../kernel/store/authStore';
import { listAgentsCircuitCourrier } from '../../kernel/api/agentsApi';
import { listDirections } from '../../kernel/api/directionsApi';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { AnnonceChargement } from '../../../shared/components/ui/AnnonceChargement';
import {
  TableWrap,
  tableClass,
  theadClass,
  thClass,
  tbodyClass,
  tdClass,
  tdClassPremiere,
  trHoverClass,
  SkeletonRows,
} from '../../../shared/components/ui/Table';
import { TipTapEditor } from '../components/TipTapEditor';
import { Inbox } from 'lucide-react';

const FORMULAIRE_DG_VIDE = {
  direction_destination_id: '',
  objet: '',
  relecteur_id: '',
  validation_dg_requise: false,
  piece_jointe: null,
};

const FORMULAIRE_VIDE = {
  objet: '',
  type: 'correspondance_generale',
  candidat_nom: '',
  candidat_email: '',
  candidat_contact: '',
  candidat_etablissement: '',
  periode_souhaitee_debut: '',
  periode_souhaitee_fin: '',
  piece_jointe: null,
};

export function CircuitQueuePage() {
  const { poste: postePourUrl } = useParams();
  const user = useAuthStore((s) => s.user);
  // La liste d'actions dépend toujours du poste réel de l'utilisateur
  // connecté, jamais du paramètre d'URL (qui ne sert qu'à la navigation) :
  // naviguer vers la file d'un autre poste ne donne accès à aucune action.
  const poste = user.poste;
  const {
    donnees: courriersReponse,
    chargement,
    recharger: charger,
  } = useRequete((signal) => listCourriers({}, signal), [poste]);
  const courriers = courriersReponse?.data ?? [];
  const [recherche, setRecherche] = useState('');
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [afficherFormulaireDg, setAfficherFormulaireDg] = useState(false);
  const [formulaireDg, setFormulaireDg] = useState(FORMULAIRE_DG_VIDE);
  const [contenuDg, setContenuDg] = useState('');
  const [directions, setDirections] = useState([]);
  const [agents, setAgents] = useState([]);
  const [erreurDg, setErreurDg] = useState(null);
  const [envoiDgEnCours, setEnvoiDgEnCours] = useState(false);
  const [selection, setSelection] = useState([]);
  const [bordereauEnCours, setBordereauEnCours] = useState(false);
  const [erreurBordereau, setErreurBordereau] = useState(null);
  const [apercuBordereau, setApercuBordereau] = useState(null);

  useEffect(() => {
    if (poste === 'secretariat_1' && afficherFormulaireDg) {
      listDirections().then(setDirections);
      listAgentsCircuitCourrier().then(setAgents);
    }
  }, [poste, afficherFormulaireDg]);

  const actions = ACTION_PAR_POSTE[poste];
  const actionsListe = Array.isArray(actions) ? actions : [];
  const statutsActionnables = actionsListe.map((a) => a.statutDepart);

  // Un même statut ("recu") peut correspondre à deux actions différentes
  // selon le circuit (court ou complet) : necessiteAvisDg, quand précisé
  // sur l'action, doit correspondre à celui du courrier pour qu'il
  // apparaisse dans cette file — sinon (ex. "au_protocole", qui n'existe
  // que dans un seul circuit) le statut seul suffit à filtrer.
  const estActionnable = (courrier) =>
    actionsListe.some(
      (a) => a.statutDepart === courrier.statut && (a.necessiteAvisDg === undefined || a.necessiteAvisDg === courrier.necessite_avis_dg),
    );

  const enAttente = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return courriers
      .filter(estActionnable)
      .filter((c) => !terme || c.objet.toLowerCase().includes(terme) || c.numero_accuse_reception.toLowerCase().includes(terme))
      // Le degré d'urgence pilote l'ordre d'affichage : très urgent en
      // tête, puis urgent, puis normal, puis non encore trié en dernier
      // (voir ORDRE_URGENCE) — jamais un blocage, juste une priorité.
      .sort((a, b) => (ORDRE_URGENCE[a.degre_urgence] ?? 3) - (ORDRE_URGENCE[b.degre_urgence] ?? 3));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courriers, recherche, poste]);

  // Tous les hooks doivent s'exécuter avant un retour anticipé (règles des
  // Hooks React) : cette redirection n'intervient qu'ensuite.
  if (postePourUrl !== poste) {
    return <Navigate to={`/circuit/${poste}`} replace />;
  }

  const estDemandeStage = formulaire.type === 'demande_stage';

  async function creerCourrier(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      await createCourrier({
        objet: formulaire.objet,
        type: formulaire.type,
        piece_jointe: formulaire.piece_jointe,
        ...(estDemandeStage
          ? {
              candidat_nom: formulaire.candidat_nom,
              candidat_email: formulaire.candidat_email,
              candidat_contact: formulaire.candidat_contact,
              candidat_etablissement: formulaire.candidat_etablissement,
              periode_souhaitee_debut: formulaire.periode_souhaitee_debut,
              periode_souhaitee_fin: formulaire.periode_souhaitee_fin,
            }
          : {}),
      });
      setFormulaire(FORMULAIRE_VIDE);
      await charger();
    } catch (err) {
      setErreur(err.response?.data?.message ?? "Échec de la création.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function initierDg(e) {
    e.preventDefault();
    setErreurDg(null);
    setEnvoiDgEnCours(true);
    try {
      await initierCourrierDg({
        direction_destination_id: formulaireDg.direction_destination_id,
        objet: formulaireDg.objet,
        projet_reponse_contenu: contenuDg,
        relecteur_id: formulaireDg.relecteur_id,
        validation_dg_requise: formulaireDg.validation_dg_requise,
        piece_jointe: formulaireDg.piece_jointe,
      });
      setFormulaireDg(FORMULAIRE_DG_VIDE);
      setContenuDg('');
      setAfficherFormulaireDg(false);
      await charger();
    } catch (err) {
      setErreurDg(err.response?.data?.message ?? "Échec de l'initiation du courrier.");
    } finally {
      setEnvoiDgEnCours(false);
    }
  }

  async function accuserReceptionEtRecharger(id) {
    await accuserReception(id);
    await charger();
  }

  function basculerSelection(id) {
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  /**
   * Lot C : regrouper puis décharger en un seul geste utilisateur — sous
   * le capot, deux appels distincts (le bordereau se crée, puis se
   * décharge), mais du point de vue de l'agent, un seul clic traite tout
   * le lot sélectionné, là où il fallait jusqu'ici une décharge par
   * dossier.
   */
  async function dechargerSelectionEnBordereau() {
    setErreurBordereau(null);
    setBordereauEnCours(true);
    try {
      const bordereau = await creerBordereauLot(selection);
      await accuserReceptionBordereauLot(bordereau.id);
      setSelection([]);
      setApercuBordereau(bordereau);
      await charger();
    } catch (err) {
      setErreurBordereau(err.response?.data?.message ?? 'Échec du regroupement en bordereau.');
    } finally {
      setBordereauEnCours(false);
    }
  }

  return (
    <div>
      <PageHeader title={`File d'attente — ${STATUT_LABELS[statutsActionnables[0]] ?? poste}`} />

      {poste === 'secretariat_1' && (
        <Card className="mb-6">
          <CardHeader
            title="Courrier de la DG"
            action={
              <Button type="button" variant={afficherFormulaireDg ? 'secondary' : 'primary'} onClick={() => setAfficherFormulaireDg((v) => !v)}>
                {afficherFormulaireDg ? 'Annuler' : 'Nouveau courrier de la DG'}
              </Button>
            }
          />
          {afficherFormulaireDg && (
            <CardBody className="space-y-4">
              {erreurDg && <Alert tone="error">{erreurDg}</Alert>}
              <form onSubmit={initierDg} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Direction destinataire" htmlFor="direction_destination_id" required>
                    <select
                      id="direction_destination_id"
                      className={inputClass}
                      value={formulaireDg.direction_destination_id}
                      onChange={(e) => setFormulaireDg((f) => ({ ...f, direction_destination_id: e.target.value }))}
                      required
                    >
                      <option value="" disabled>
                        Choisir une direction
                      </option>
                      {directions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nom}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Objet" htmlFor="objet_dg" required>
                    <input
                      id="objet_dg"
                      className={inputClass}
                      value={formulaireDg.objet}
                      onChange={(e) => setFormulaireDg((f) => ({ ...f, objet: e.target.value }))}
                      required
                    />
                  </Field>
                </div>

                <Field label="Contenu">
                  <TipTapEditor content={contenuDg} onChange={setContenuDg} />
                </Field>

                <Field label="Relecteur désigné" htmlFor="relecteur_dg" required>
                  <select
                    id="relecteur_dg"
                    className={inputClass}
                    value={formulaireDg.relecteur_id}
                    onChange={(e) => setFormulaireDg((f) => ({ ...f, relecteur_id: e.target.value }))}
                    required
                  >
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

                <Field label="Pièce jointe (facultatif)" htmlFor="piece_jointe_dg">
                  <input
                    id="piece_jointe_dg"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormulaireDg((f) => ({ ...f, piece_jointe: e.target.files?.[0] ?? null }))}
                    className="block w-full text-sm text-text-muted file:mr-3 file:rounded-field file:border-0 file:bg-ont-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ont-blue-700 hover:file:bg-ont-blue-100 dark:file:bg-ont-blue-950 dark:file:text-ont-blue-300"
                  />
                </Field>

                <label className="flex items-center gap-2 text-sm text-text-muted">
                  <input
                    type="checkbox"
                    checked={formulaireDg.validation_dg_requise}
                    onChange={(e) => setFormulaireDg((f) => ({ ...f, validation_dg_requise: e.target.checked }))}
                  />
                  Nécessite la validation de la DG avant envoi
                </label>

                <Button type="submit" disabled={envoiDgEnCours || !formulaireDg.direction_destination_id || !formulaireDg.relecteur_id}>
                  {envoiDgEnCours ? 'Envoi…' : 'Initier le courrier'}
                </Button>
              </form>
            </CardBody>
          )}
        </Card>
      )}

      {poste === 'reception' && (
        <Card className="mb-6">
          <CardHeader title="Nouveau courrier reçu" />
          <CardBody>
            {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}
            <form onSubmit={creerCourrier} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Objet" htmlFor="objet" required>
                <input
                  id="objet"
                  className={inputClass}
                  value={formulaire.objet}
                  onChange={(e) => setFormulaire((f) => ({ ...f, objet: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Type" htmlFor="type">
                <select
                  id="type"
                  className={inputClass}
                  value={formulaire.type}
                  onChange={(e) => setFormulaire((f) => ({ ...f, type: e.target.value }))}
                >
                  {Object.entries(TYPE_LABELS).map(([valeur, libelle]) => (
                    <option key={valeur} value={valeur}>
                      {libelle}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Document scanné" htmlFor="piece_jointe" required hint="Numérisation obligatoire du courrier physique reçu — PDF, JPG ou PNG, 5 Mo max.">
                <input
                  id="piece_jointe"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFormulaire((f) => ({ ...f, piece_jointe: e.target.files?.[0] ?? null }))}
                  className="block w-full text-sm text-text-muted file:mr-3 file:rounded-field file:border-0 file:bg-ont-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ont-blue-700 hover:file:bg-ont-blue-100 dark:file:bg-ont-blue-950 dark:file:text-ont-blue-300"
                  required
                />
              </Field>

              {estDemandeStage && (
                <>
                  <Field label="Nom du candidat" htmlFor="candidat_nom" required>
                    <input
                      id="candidat_nom"
                      className={inputClass}
                      value={formulaire.candidat_nom}
                      onChange={(e) => setFormulaire((f) => ({ ...f, candidat_nom: e.target.value }))}
                      required
                    />
                  </Field>
                  <Field label="E-mail (facultatif)" htmlFor="candidat_email" hint="Sert au suivi public du dossier et à l'envoi de l'accusé de réception.">
                    <input
                      id="candidat_email"
                      type="email"
                      className={inputClass}
                      value={formulaire.candidat_email}
                      onChange={(e) => setFormulaire((f) => ({ ...f, candidat_email: e.target.value }))}
                    />
                  </Field>
                  <Field label="Contact (téléphone/e-mail)" htmlFor="candidat_contact" required>
                    <input
                      id="candidat_contact"
                      className={inputClass}
                      value={formulaire.candidat_contact}
                      onChange={(e) => setFormulaire((f) => ({ ...f, candidat_contact: e.target.value }))}
                      required
                    />
                  </Field>
                  <Field label="Établissement d'origine" htmlFor="candidat_etablissement" required>
                    <input
                      id="candidat_etablissement"
                      className={inputClass}
                      value={formulaire.candidat_etablissement}
                      onChange={(e) => setFormulaire((f) => ({ ...f, candidat_etablissement: e.target.value }))}
                      required
                    />
                  </Field>
                  <Field label="Période souhaitée — début" htmlFor="periode_souhaitee_debut" required>
                    <input
                      id="periode_souhaitee_debut"
                      type="date"
                      className={inputClass}
                      value={formulaire.periode_souhaitee_debut}
                      onChange={(e) => setFormulaire((f) => ({ ...f, periode_souhaitee_debut: e.target.value }))}
                      required
                    />
                  </Field>
                  <Field label="Période souhaitée — fin" htmlFor="periode_souhaitee_fin" required>
                    <input
                      id="periode_souhaitee_fin"
                      type="date"
                      className={inputClass}
                      value={formulaire.periode_souhaitee_fin}
                      onChange={(e) => setFormulaire((f) => ({ ...f, periode_souhaitee_fin: e.target.value }))}
                      required
                    />
                  </Field>
                </>
              )}

              <div className="flex items-end">
                <Button type="submit" disabled={envoiEnCours || !formulaire.piece_jointe}>
                  {envoiEnCours ? 'Enregistrement…' : 'Enregistrer la réception'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title={`À traiter (${enAttente.length})`}
          action={<SearchBar value={recherche} onChange={setRecherche} />}
        />
        {selection.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface-sunken px-4 py-3">
            <span className="text-sm text-text-muted">{selection.length} sélectionné(s)</span>
            {erreurBordereau && <span className="text-sm text-ont-red-700">{erreurBordereau}</span>}
            <Button type="button" size="sm" disabled={bordereauEnCours} onClick={dechargerSelectionEnBordereau}>
              {bordereauEnCours ? 'Traitement…' : 'Décharger la sélection en bordereau'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setSelection([])}>
              Annuler la sélection
            </Button>
          </div>
        )}
        <CardBody className="p-0">
          <AnnonceChargement chargement={chargement} count={enAttente.length} libelle="courrier(s) à traiter" />
          {!chargement && enAttente.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Inbox size={32} />} title="Rien à traiter pour le moment" description="Les nouveaux courriers apparaîtront ici dès qu'ils arrivent à votre poste." />
            </div>
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead className={theadClass}>
                  <tr>
                    <th className={thClass}></th>
                    <th className={thClass}>Référence</th>
                    <th className={thClass}>Objet</th>
                    <th className={thClass}>Type</th>
                    <th className={thClass}>Urgence</th>
                    <th className={thClass}>Statut</th>
                    <th className={thClass}></th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {chargement ? (
                    <SkeletonRows colonnes={7} />
                  ) : (
                    enAttente.map((c) => {
                      // Cas particulier : la file "dg" affiche aussi les
                      // dossiers en_relecture (pour la signature), mais le
                      // destinataire du bordereau en_relecture est toujours le
                      // relecteur désigné, jamais la DG — lui montrer "en
                      // transit"/"Accuser réception" produirait un bouton que
                      // la DG ne peut jamais actionner avec succès.
                      const dechargeNonPertinentePourCePoste = poste === 'dg' && c.statut === 'en_relecture';
                      const enTransitPourCePoste = c.en_transit && !dechargeNonPertinentePourCePoste;

                      return (
                        <tr key={c.id} className={trHoverClass}>
                          <td className={tdClass}>
                            {enTransitPourCePoste && (
                              <input
                                type="checkbox"
                                checked={selection.includes(c.id)}
                                onChange={() => basculerSelection(c.id)}
                                aria-label={`Sélectionner ${c.numero_accuse_reception}`}
                              />
                            )}
                          </td>
                          <td className={`${tdClassPremiere} whitespace-nowrap`}>{c.numero_accuse_reception}</td>
                          <td className={`${tdClass} max-w-[16rem] truncate`} title={c.objet}>{c.objet}</td>
                          <td className={tdClass}>{TYPE_LABELS[c.type]}</td>
                          <td className={tdClass}>
                            {c.degre_urgence ? (
                              <Badge tone={TONE_URGENCE[c.degre_urgence]}>{DEGRE_URGENCE_LABELS[c.degre_urgence]}</Badge>
                            ) : (
                              <span className="text-text-subtle">Pas encore trié</span>
                            )}
                          </td>
                          <td className={tdClass}>
                            {enTransitPourCePoste ? (
                              <Badge tone="warning">En transit</Badge>
                            ) : (
                              <Badge tone="info">{STATUT_LABELS[c.statut]}</Badge>
                            )}
                          </td>
                          <td className={tdClass}>
                            {enTransitPourCePoste ? (
                              <Button type="button" size="sm" variant="secondary" onClick={() => accuserReceptionEtRecharger(c.id)}>
                                Accuser réception
                              </Button>
                            ) : (
                              <Link to={`/courriers/${c.id}`}>
                                <Button type="button" size="sm">
                                  Traiter
                                </Button>
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </TableWrap>
          )}
        </CardBody>
      </Card>

      <DocumentPreviewModal
        open={apercuBordereau !== null}
        onClose={() => setApercuBordereau(null)}
        title={`Bordereau ${apercuBordereau?.numero ?? ''}`}
        url={apercuBordereau ? bordereauLotPdfUrl(apercuBordereau.id) : undefined}
        downloadFilename={apercuBordereau ? `bordereau-${apercuBordereau.numero}.pdf` : undefined}
      />
    </div>
  );
}
