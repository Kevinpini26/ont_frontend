import { Check } from 'lucide-react';
import {
  STATUTS,
  STATUTS_CIRCUIT_COURT,
  STATUTS_INITIE_PAR_DG_AVEC_VALIDATION,
  STATUTS_INITIE_PAR_DG_SANS_VALIDATION,
  STATUT_LABELS,
} from '../constants';
import { formaterDateHeure } from '../utils/dateHeure';
import { libelleStatutCourrier } from '../utils/presentationCourrier';

/**
 * Frise de progression du circuit — l'écran que la direction regarde en
 * démonstration. Horizontale et reliée par un trait sur desktop, verticale
 * sur mobile (une frise horizontale à 7 pastilles ne tient pas sur un petit
 * écran sans devenir illisible). `transitions` (voir CourrierResource) sert
 * uniquement à afficher le poste et l'horodatage sous chaque étape déjà
 * franchie ou en cours — la progression elle-même reste dérivée de
 * `statut`, transitions peut être absent (ex. liste, pas fiche détail).
 */
export function StatutTimeline({ statut, necessiteAvisDg = true, initieParDg = false, validationDgRequise = false, relectureValideeAt = null, transitions = [] }) {
  const etapes = initieParDg
    ? (validationDgRequise ? STATUTS_INITIE_PAR_DG_AVEC_VALIDATION : STATUTS_INITIE_PAR_DG_SANS_VALIDATION)
    : (necessiteAvisDg ? STATUTS : STATUTS_CIRCUIT_COURT);
  // "retour_reception" (bouclage sur avis réservé) n'a pas de position fixe
  // dans une frise à sens unique : affiché comme un retour temporaire vers
  // "en_attente_avis_dg", l'étape à laquelle le dossier va revenir — voir
  // constants.js.
  const enBouclage = statut === 'retour_reception';
  // "en_attente_classeur" (lot assistants, degré normal) est un détour qui
  // reconverge vers "en_attente_avis_dg" — jamais une position fixe non plus,
  // même traitement que le bouclage ci-dessus.
  const auClasseur = statut === 'en_attente_classeur';
  // "en_dispatch"/"chez_direction" (Lot 3, avis favorable + courrier
  // imputé) ne rejoignent jamais projet_a_rediger dans cette
  // frise : c'est la branche alternative empruntée à sa place — ancré sur
  // cette même position plutôt qu'absent de la frise.
  const estDispatche = statut === 'en_dispatch' || statut === 'chez_direction';
  const indexCourant = etapes.indexOf(
    enBouclage || auClasseur ? 'en_attente_avis_dg' : estDispatche ? 'projet_a_rediger' : statut,
  );

  return (
    <section className="rounded-card border border-border bg-surface shadow-[0_1px_2px_rgb(15_23_42/0.025)]">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ont-blue-700 dark:text-ont-blue-300">Circuit actuel</p>
        <h2 className="mt-1 font-heading text-section-title font-semibold text-text">Progression du courrier</h2>
      </div>
      <ol className="flex flex-col gap-0 p-4 sm:flex-row sm:gap-0 sm:p-5">
      {etapes.map((s, index) => {
        const franchie = index < indexCourant;
        const courante = index === indexCourant;
        const dernier = index === etapes.length - 1;
        const transition = transitions?.find((t) => t.statut === s);
        const dateTransition = formaterDateHeure(transition?.created_at);

        return (
          <li key={s} className={`flex gap-3 sm:min-w-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-0 sm:text-center`}>
            <div className="flex flex-col items-center sm:w-full sm:flex-row">
              <span
                aria-current={courante ? 'step' : undefined}
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  franchie
                    ? 'bg-ont-blue-600 text-white'
                    : courante
                      ? 'bg-surface-raised text-ont-blue-700 ring-2 ring-ont-gold-400 dark:text-ont-blue-300'
                      : 'bg-surface-sunken text-text-subtle ring-1 ring-inset ring-border-strong'
                }`}
              >
                {franchie ? <Check size={15} aria-hidden="true" /> : index + 1}
              </span>
              {!dernier && (
                <div
                  aria-hidden="true"
                  className={`my-1 h-6 w-0.5 sm:my-0 sm:ml-1 sm:mr-1 sm:h-0.5 sm:w-full sm:flex-1 ${
                    franchie ? 'bg-ont-blue-600' : 'bg-border-strong'
                  }`}
                />
              )}
            </div>
            <div className="pb-4 sm:w-full sm:px-1 sm:pb-0 sm:pt-1.5">
              <p className={`text-xs font-medium ${courante ? 'text-text' : franchie ? 'text-text-muted' : 'text-text-subtle'}`}>
                {s === statut
                  ? libelleStatutCourrier({ statut: s, relecture_validee_at: relectureValideeAt })
                  : STATUT_LABELS[s]}
              </p>
              {courante && enBouclage && (
                <p className="mt-0.5 text-xs font-medium text-ont-gold-700 dark:text-ont-gold-400">
                  Retour depuis un avis réservé — {STATUT_LABELS.retour_reception}
                </p>
              )}
              {courante && auClasseur && (
                <p className="mt-0.5 text-xs font-medium text-ont-gold-700 dark:text-ont-gold-400">
                  Tenu au classeur d'attente — {STATUT_LABELS.en_attente_classeur}
                </p>
              )}
              {courante && estDispatche && (
                <p className="mt-0.5 text-xs font-medium text-ont-gold-700 dark:text-ont-gold-400">
                  Courrier imputé, dispatché vers la direction — {STATUT_LABELS[statut]}
                </p>
              )}
              {(franchie || courante) && transition && dateTransition && (
                <p className="mt-0.5 text-xs text-text-subtle">
                  {transition.emetteur ?? 'Guichet public'}
                  <span className="hidden sm:inline"> · </span>
                  <br className="sm:hidden" />
                  {dateTransition}
                </p>
              )}
            </div>
          </li>
        );
      })}
      </ol>
    </section>
  );
}
