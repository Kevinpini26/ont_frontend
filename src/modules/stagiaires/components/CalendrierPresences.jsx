import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { enregistrerPresence, supprimerPresence } from '../api/stagiairesApi';
import { JOURS_SEMAINE, ajouterMois, joursDuMois, libelleMois, todayStr, ymKey } from '../utils/calendrierPresencesUtils';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';

// Mêmes références horaires que AssiduiteCalculateur::HEURE_ARRIVEE_REFERENCE
// / HEURE_DEPART_REFERENCE côté backend — un premier clic sur un jour vide
// crée une présence "à l'heure" par défaut.
const HEURE_ARRIVEE_DEFAUT = '08:30';
const HEURE_DEPART_DEFAUT = '15:30';

/**
 * Calendrier mensuel de présence, sur la fiche du stagiaire. Remplace la
 * saisie ligne-par-ligne : un jour ouvré passé se coche/décoche directement
 * dans la grille, avec un éditeur inline pour ajuster les heures d'un jour
 * déjà coché (retard réel à corriger) sans perdre la granularité horaire
 * utilisée par AssiduiteCalculateur.
 */
export function CalendrierPresences({ stagiaire, presences, onChange }) {
  const debutStage = stagiaire.date_debut_stage;
  const finStage = stagiaire.date_fin_stage;
  const aujourdHui = todayStr();
  const finBorne = finStage && finStage < aujourdHui ? finStage : aujourdHui;

  const ymDebut = debutStage ? ymKey(debutStage) : ymKey(aujourdHui);
  const ymFin = ymKey(finBorne);

  const [moisAffiche, setMoisAffiche] = useState(ymFin);
  const [jourSelectionne, setJourSelectionne] = useState(null);
  const [heureArrivee, setHeureArrivee] = useState('');
  const [heureDepart, setHeureDepart] = useState('');
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const presencesParDate = useMemo(() => {
    const map = {};
    for (const p of presences) map[p.date] = p;
    return map;
  }, [presences]);

  const regulariteFaible = stagiaire.assiduite_suggestion && stagiaire.assiduite_suggestion.regularite < 3;

  const jours = useMemo(() => joursDuMois(moisAffiche), [moisAffiche]);
  const decalageDebut = (jours[0].jourSemaine + 6) % 7; // grille commençant le lundi

  const peutReculer = moisAffiche > ymDebut;
  const peutAvancer = moisAffiche < ymFin;

  function fermerEditeur() {
    setJourSelectionne(null);
    setErreur(null);
  }

  async function creerRapidement(jour) {
    setErreur(null);
    try {
      const presence = await enregistrerPresence(stagiaire.id, jour, HEURE_ARRIVEE_DEFAUT, HEURE_DEPART_DEFAUT);
      onChange(presence);
    } catch (err) {
      setErreur(err.response?.data?.message ?? "Échec de l'enregistrement.");
    }
  }

  function ouvrirEditeur(jour) {
    const presence = presencesParDate[jour];
    setJourSelectionne(jour);
    setHeureArrivee(presence?.heure_arrivee?.slice(0, 5) ?? HEURE_ARRIVEE_DEFAUT);
    setHeureDepart(presence?.heure_depart?.slice(0, 5) ?? HEURE_DEPART_DEFAUT);
    setErreur(null);
  }

  function cliquerJour(jour, actionnable, coche) {
    if (!actionnable) return;
    if (coche) {
      ouvrirEditeur(jour);
    } else {
      creerRapidement(jour);
    }
  }

  async function enregistrerModification(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const presence = await enregistrerPresence(stagiaire.id, jourSelectionne, heureArrivee, heureDepart);
      onChange(presence);
      fermerEditeur();
    } catch (err) {
      setErreur(
        err.response?.data?.message ??
          Object.values(err.response?.data?.errors ?? {})[0]?.[0] ??
          "Échec de l'enregistrement.",
      );
    } finally {
      setEnvoi(false);
    }
  }

  async function decocher() {
    setEnvoi(true);
    setErreur(null);
    try {
      await supprimerPresence(stagiaire.id, jourSelectionne);
      onChange(null, jourSelectionne);
      fermerEditeur();
    } catch {
      setErreur('Échec de la suppression.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!peutReculer}
            onClick={() => setMoisAffiche((m) => ajouterMois(m, -1))}
            aria-label="Mois précédent"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-text">
            {libelleMois(moisAffiche)}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!peutAvancer}
            onClick={() => setMoisAffiche((m) => ajouterMois(m, 1))}
            aria-label="Mois suivant"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-subtle">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-ont-green-500" /> Présent</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-ont-red-500" /> Absent</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-border-strong" /> Week-end / hors période</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {JOURS_SEMAINE.map((j) => (
          <div key={j} className="pb-1 text-center text-xs font-medium text-text-subtle">
            {j}
          </div>
        ))}

        {Array.from({ length: decalageDebut }).map((_, i) => (
          <div key={`vide-${i}`} />
        ))}

        {jours.map(({ dateStr: jour, jourSemaine }) => {
          const weekend = jourSemaine === 0 || jourSemaine === 6;
          const futur = jour > aujourdHui;
          const horsPeriode = (debutStage && jour < debutStage) || (finStage && jour > finStage);
          const coche = Boolean(presencesParDate[jour]);
          const actionnable = !weekend && !futur && !horsPeriode;
          const absentSignale = actionnable && !coche && regulariteFaible;
          const numeroJour = Number(jour.slice(8, 10));

          let classes = 'flex h-10 items-center justify-center rounded-md text-sm transition-colors';
          if (weekend || horsPeriode) {
            classes += ' bg-surface-sunken text-text-subtle';
          } else if (futur) {
            classes += ' text-text-subtle';
          } else if (coche) {
            classes += ' cursor-pointer bg-ont-green-100 font-semibold text-ont-green-800 hover:bg-ont-green-200 dark:bg-ont-green-900/40 dark:text-ont-green-300';
          } else if (absentSignale) {
            classes += ' cursor-pointer bg-ont-red-500/10 font-semibold text-ont-red-700 hover:bg-ont-red-500/20 dark:text-ont-red-300';
          } else {
            classes += ' cursor-pointer bg-surface-sunken text-text-muted hover:bg-border';
          }
          if (jourSelectionne === jour) {
            classes += ' ring-2 ring-inset ring-ont-blue-600';
          }

          const raisonInactionnable = weekend ? 'week-end' : futur ? 'à venir' : horsPeriode ? 'hors période de stage' : null;
          const libelleJour = `${jour}${coche ? ', présent' : absentSignale ? ', absent' : ''}${raisonInactionnable ? `, ${raisonInactionnable}` : ''}`;

          return (
            <button
              key={jour}
              type="button"
              disabled={!actionnable}
              onClick={() => cliquerJour(jour, actionnable, coche)}
              className={classes}
              aria-label={libelleJour}
              aria-pressed={actionnable ? coche : undefined}
              title={coche ? `Présent — cliquer pour ajuster` : actionnable ? 'Cliquer pour marquer présent' : undefined}
            >
              {numeroJour}
            </button>
          );
        })}
      </div>

      {jourSelectionne && (
        <div className="mt-5 rounded-field border border-border bg-surface-sunken p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-text">{jourSelectionne}</p>
            <button type="button" onClick={fermerEditeur} className="text-xs text-text-subtle hover:underline">
              Fermer
            </button>
          </div>

          {erreur && <Alert tone="error" className="mb-3">{erreur}</Alert>}

          <form onSubmit={enregistrerModification} className="flex flex-wrap items-end gap-3">
            <Field label="Heure d'arrivée" htmlFor="edit_arrivee">
              <input
                id="edit_arrivee"
                type="time"
                className={inputClass}
                value={heureArrivee}
                onChange={(e) => setHeureArrivee(e.target.value)}
              />
            </Field>
            <Field label="Heure de départ" htmlFor="edit_depart">
              <input
                id="edit_depart"
                type="time"
                className={inputClass}
                value={heureDepart}
                onChange={(e) => setHeureDepart(e.target.value)}
              />
            </Field>
            <Button type="submit" size="sm" disabled={envoi}>
              {envoi ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={envoi} onClick={decocher}>
              Décocher
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
