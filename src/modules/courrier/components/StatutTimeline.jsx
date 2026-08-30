import { Check } from 'lucide-react';
import {
  STATUTS,
  STATUTS_CIRCUIT_COURT,
  STATUTS_INITIE_PAR_DG_AVEC_VALIDATION,
  STATUTS_INITIE_PAR_DG_SANS_VALIDATION,
  STATUT_LABELS,
} from '../constants';

function horodatage(iso) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * Frise de progression du circuit — l'écran que la direction regarde en
 * démonstration. Horizontale et reliée par un trait sur desktop, verticale
 * sur mobile (une frise horizontale à 7 pastilles ne tient pas sur un petit
 * écran sans devenir illisible). `transitions` (voir CourrierResource) sert
 * uniquement à afficher le poste et l'horodatage sous chaque étape déjà
 * franchie ou en cours — la progression elle-même reste dérivée de
 * `statut`, transitions peut être absent (ex. liste, pas fiche détail).
 */
export function StatutTimeline({ statut, necessiteAvisDg = true, initieParDg = false, validationDgRequise = false, transitions = [] }) {
  const etapes = initieParDg
    ? (validationDgRequise ? STATUTS_INITIE_PAR_DG_AVEC_VALIDATION : STATUTS_INITIE_PAR_DG_SANS_VALIDATION)
    : (necessiteAvisDg ? STATUTS : STATUTS_CIRCUIT_COURT);
  const indexCourant = etapes.indexOf(statut);

  return (
    <ol className="mb-6 flex flex-col gap-0 rounded-card border border-border bg-surface p-4 sm:flex-row sm:gap-0 sm:p-5">
      {etapes.map((s, index) => {
        const franchie = index < indexCourant;
        const courante = index === indexCourant;
        const dernier = index === etapes.length - 1;
        const transition = transitions?.find((t) => t.statut === s);

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
                {courante && (
                  <span aria-hidden="true" className="animate-anneau-pulse absolute inset-0 rounded-full ring-2 ring-ont-gold-400" />
                )}
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
                {STATUT_LABELS[s]}
              </p>
              {(franchie || courante) && transition && (
                <p className="mt-0.5 text-xs text-text-subtle">
                  {transition.emetteur ?? 'Guichet public'}
                  <span className="hidden sm:inline"> · </span>
                  <br className="sm:hidden" />
                  {horodatage(transition.created_at)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
