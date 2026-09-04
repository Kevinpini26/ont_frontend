import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useRequete } from '../../../shared/hooks/useRequete';
import {
  getTableauRepartition,
  ajouterLigneTableau,
  retirerLigneTableau,
  soumettreTableau,
  representerDgTableau,
  rendreAvisTableau,
} from '../api/tableauxRepartitionApi';
import { listStagiaires } from '../api/stagiairesApi';
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

const LIGNE_VIDE = {
  stagiaireId: '',
  directionAccueilProposeeId: '',
  dateDebutProposee: '',
  dateFinProposee: '',
  encadrantPressenti: '',
};

export function TableauRepartitionDetailPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const { donnees: tableau, setDonnees: setTableau, chargement } = useRequete((signal) => getTableauRepartition(id, signal), [id]);
  const [stagiairesDisponibles, setStagiairesDisponibles] = useState([]);
  const [directions, setDirections] = useState([]);
  const [ligne, setLigne] = useState(LIGNE_VIDE);
  const [avis, setAvis] = useState('favorable');
  const [observations, setObservations] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [apercuPdf, setApercuPdf] = useState(false);

  useEffect(() => {
    listDirections().then(setDirections);
  }, []);

  useEffect(() => {
    if (tableau?.modifiable) {
      listStagiaires({ statut: 'en_attente_affectation' }).then((r) => setStagiairesDisponibles(r.data ?? []));
    }
  }, [tableau?.modifiable]);

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

  async function soumettreLigne(e) {
    e.preventDefault();
    await executer(() => ajouterLigneTableau(id, ligne));
    setLigne(LIGNE_VIDE);
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
          <CardHeader title="Ajouter une demande" />
          <CardBody>
            <form onSubmit={soumettreLigne} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Stagiaire (en attente d'affectation)" htmlFor="stagiaireId" required>
                <select id="stagiaireId" className={inputClass} value={ligne.stagiaireId} onChange={(e) => setLigne((l) => ({ ...l, stagiaireId: e.target.value }))} required>
                  <option value="" disabled>Choisir…</option>
                  {stagiairesDisponibles.map((s) => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
              </Field>
              <Field label="Direction d'accueil proposée" htmlFor="directionAccueilProposeeId" required>
                <select id="directionAccueilProposeeId" className={inputClass} value={ligne.directionAccueilProposeeId} onChange={(e) => setLigne((l) => ({ ...l, directionAccueilProposeeId: e.target.value }))} required>
                  <option value="" disabled>Choisir…</option>
                  {directions.map((d) => (
                    <option key={d.id} value={d.id}>{d.code} — {d.nom}</option>
                  ))}
                </select>
              </Field>
              <Field label="Date de début proposée" htmlFor="dateDebutProposee" required>
                <input id="dateDebutProposee" type="date" className={inputClass} value={ligne.dateDebutProposee} onChange={(e) => setLigne((l) => ({ ...l, dateDebutProposee: e.target.value }))} required />
              </Field>
              <Field label="Date de fin proposée" htmlFor="dateFinProposee" required>
                <input id="dateFinProposee" type="date" className={inputClass} value={ligne.dateFinProposee} onChange={(e) => setLigne((l) => ({ ...l, dateFinProposee: e.target.value }))} required />
              </Field>
              <Field label="Encadrant pressenti" htmlFor="encadrantPressenti" required>
                <input id="encadrantPressenti" className={inputClass} value={ligne.encadrantPressenti} onChange={(e) => setLigne((l) => ({ ...l, encadrantPressenti: e.target.value }))} required />
              </Field>
              <div className="flex items-end">
                <Button type="submit" disabled={envoiEnCours}>Ajouter</Button>
              </div>
            </form>
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
