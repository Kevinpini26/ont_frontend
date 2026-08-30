import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { enregistrerPresence, supprimerPresence } from '../api/stagiairesApi';
import { JOURS_SEMAINE, ajouterMois, joursDuMois, libelleMois, todayStr, ymKey } from '../utils/calendrierPresencesUtils';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';

// Mêmes références horaires que AssiduiteCalculateur::HEURE_ARRIVEE_REFERENCE
// / HEURE_DEPART_REFERENCE côté backend — un premier clic sur un jour vide
// crée une présence "à l'heure" par défaut, et la même référence distingue
// ici un jour "présent" (à l'heure) d'un jour "partiel" (pointé, mais en
// écart d'arrivée ou de départ).
const HEURE_ARRIVEE_DEFAUT = '08:30';
const HEURE_DEPART_DEFAUT = '15:30';

function estALHeure(presence) {
  if (!presence?.heure_arrivee) return false;
  const arriveeOk = presence.heure_arrivee.slice(0, 5) <= HEURE_ARRIVEE_DEFAUT;
  const departOk = !presence.heure_depart || presence.heure_depart.slice(0, 5) >= HEURE_DEPART_DEFAUT;
  return arriveeOk && departOk;
}

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
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-ont-green-300" /> Présent</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-ont-gold-300" /> Partiel</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-ont-red-500/40" /> Absent</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-border-strong" /> Non saisi</span>
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
          const presence = presencesParDate[jour];
          const coche = Boolean(presence);
          const actionnable = !weekend && !futur && !horsPeriode;
          // Un jour ouvré passé, dans la période, sans pointage est une
          // absence de fait — pas une simple case neutre — dès qu'il est
          // révolu, pas seulement quand une moyenne globale est mauvaise.
          const absent = actionnable && !coche;
          const partiel = coche && !estALHeure(presence);
          const numeroJour = Number(jour.slice(8, 10));

          let classes =
            'flex h-10 items-center justify-center rounded-md text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ont-blue-500';
          if (weekend || horsPeriode || futur) {
            classes += ' bg-surface-sunken text-text-subtle';
          } else if (coche && !partiel) {
            classes += ' cursor-pointer bg-ont-green-300 font-semibold text-ont-green-900 hover:brightness-95';
          } else if (partiel) {
            classes += ' cursor-pointer bg-ont-gold-300 font-semibold text-ont-gold-900 hover:brightness-95';
          } else if (absent) {
            // /25 plutôt que /40 : au-delà, le rouge composite avec le fond
            // clair descend sous 4,5 de contraste avec le texte le plus
            // sombre disponible (ont-red-700, aucun ont-red-900 dans la
            // charte) — vérifié par calcul, pas à l'œil.
            classes += ' cursor-pointer bg-ont-red-500/25 font-semibold text-ont-red-700 hover:bg-ont-red-500/35 dark:text-ont-red-300';
          } else {
            classes += ' cursor-pointer bg-surface-sunken text-text-muted hover:bg-border';
          }
          if (jourSelectionne === jour) {
            classes += ' ring-2 ring-inset ring-ont-blue-600';
          }

          const raisonInactionnable = weekend ? 'week-end' : futur ? 'à venir' : horsPeriode ? 'hors période de stage' : null;
          const libelleJour = `${jour}${coche ? (partiel ? ', présent (partiel)' : ', présent') : absent ? ', absent' : ''}${
            raisonInactionnable ? `, ${raisonInactionnable}` : ''
          }`;
          const infoBulle = coche
            ? `Arrivée ${presence.heure_arrivee?.slice(0, 5) ?? '—'} · Départ ${presence.heure_depart?.slice(0, 5) ?? '—'}`
            : actionnable
              ? 'Cliquer pour marquer présent'
              : undefined;

          return (
            <button
              key={jour}
              type="button"
              disabled={!actionnable}
              onClick={() => cliquerJour(jour, actionnable, coche)}
              className={classes}
              aria-label={libelleJour}
              aria-pressed={actionnable ? coche : undefined}
              title={infoBulle}
            >
              {numeroJour}
            </button>
          );
        })}
      </div>

      <TauxAssiduiteMois jours={jours} presencesParDate={presencesParDate} aujourdHui={aujourdHui} debutStage={debutStage} finStage={finStage} />

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

/**
 * Taux d'assiduité du mois affiché : jours pointés / jours ouvrés déjà
 * révolus dans ce mois (bornés par la période du stage et aujourd'hui) —
 * pas les jours ouvrés du mois entier, un mois en cours ne peut pas être
 * jugé sur des jours qui n'ont pas encore eu lieu.
 */
function TauxAssiduiteMois({ jours, presencesParDate, aujourdHui, debutStage, finStage }) {
  let joursActionnables = 0;
  let joursPointes = 0;

  for (const { dateStr: jour, jourSemaine } of jours) {
    const weekend = jourSemaine === 0 || jourSemaine === 6;
    const futur = jour > aujourdHui;
    const horsPeriode = (debutStage && jour < debutStage) || (finStage && jour > finStage);
    if (weekend || futur || horsPeriode) continue;
    joursActionnables++;
    if (presencesParDate[jour]) joursPointes++;
  }

  if (joursActionnables === 0) return null;

  const taux = Math.round((joursPointes / joursActionnables) * 100);

  return (
    <p className="mt-4 border-t border-border pt-3 text-sm text-text-muted">
      Assiduité du mois : <span className="text-base font-semibold text-text">{taux} %</span>{' '}
      <span className="text-text-subtle">
        ({joursPointes} / {joursActionnables} jour(s) ouvré(s) pointé(s))
      </span>
    </p>
  );
}
