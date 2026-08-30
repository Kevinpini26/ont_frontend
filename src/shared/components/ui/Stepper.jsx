import { Check } from 'lucide-react';

/**
 * Étapes horizontales reliées par un connecteur — pour une progression
 * linéaire dont l'ordre porte du sens (ex. le circuit courrier), à
 * distinguer de StatutTimeline (des pastilles libres, sans connecteur, pour
 * un ensemble de statuts qui ne se parcourt pas forcément dans un seul
 * sens). `etapes` : tableau de chaînes ou de `{ cle, label }`.
 * `overflow-x-auto` plutôt qu'un retour à la ligne : un connecteur qui
 * s'enroule sur plusieurs lignes perd toute lisibilité, mieux vaut faire
 * défiler horizontalement (même principe que TableWrap).
 */
export function Stepper({ etapes, indexCourant }) {
  return (
    <ol className="flex overflow-x-auto pb-1">
      {etapes.map((etape, index) => {
        const cle = typeof etape === 'string' ? etape : (etape.cle ?? etape.label);
        const label = typeof etape === 'string' ? etape : etape.label;
        const franchie = index < indexCourant;
        const courante = index === indexCourant;
        const dernier = index === etapes.length - 1;

        return (
          <li key={cle} className={`flex items-start ${dernier ? '' : 'flex-1'}`}>
            <div className="flex w-20 shrink-0 flex-col items-center gap-1.5">
              <span
                aria-current={courante ? 'step' : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  courante
                    ? 'bg-ont-blue-700 text-white'
                    : franchie
                      ? 'bg-ont-green-600 text-white'
                      : 'bg-surface-sunken text-text-subtle ring-1 ring-inset ring-border-strong'
                }`}
              >
                {franchie ? <Check size={15} aria-hidden="true" /> : index + 1}
              </span>
              <span className={`text-center text-xs leading-tight ${courante ? 'font-semibold text-text' : 'text-text-subtle'}`}>
                {label}
              </span>
            </div>
            {!dernier && (
              <div
                aria-hidden="true"
                className={`mt-3.5 h-0.5 min-w-8 flex-1 rounded-full ${franchie ? 'bg-ont-green-600' : 'bg-border-strong'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
