import { CheckCircle2 } from 'lucide-react';
import {
  STATUTS,
  STATUTS_CIRCUIT_COURT,
  STATUTS_INITIE_PAR_DG_AVEC_VALIDATION,
  STATUTS_INITIE_PAR_DG_SANS_VALIDATION,
  STATUT_LABELS,
} from '../constants';

/**
 * necessiteAvisDg peut être indéfini le temps du premier rendu (courrier
 * pas encore chargé) : le circuit complet est alors utilisé par défaut,
 * sans conséquence puisque le composant ne s'affiche qu'une fois la fiche
 * chargée. initieParDg prend le pas sur necessiteAvisDg (un courrier
 * initié par la DG a toujours necessiteAvisDg=false, mais suit ses propres
 * étapes, pas le circuit court).
 */
export function StatutTimeline({ statut, necessiteAvisDg = true, initieParDg = false, validationDgRequise = false }) {
  const etapes = initieParDg
    ? (validationDgRequise ? STATUTS_INITIE_PAR_DG_AVEC_VALIDATION : STATUTS_INITIE_PAR_DG_SANS_VALIDATION)
    : (necessiteAvisDg ? STATUTS : STATUTS_CIRCUIT_COURT);
  const indexCourant = etapes.indexOf(statut);

  return (
    <ol className="mb-6 flex flex-wrap gap-2">
      {etapes.map((s, index) => {
        const franchie = index < indexCourant;
        const courante = index === indexCourant;
        return (
          <li
            key={s}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
              courante
                ? 'bg-ont-blue-700 text-white'
                : franchie
                  ? 'bg-ont-green-50 text-ont-green-700 dark:bg-ont-green-900/40 dark:text-ont-green-300'
                  : 'bg-surface-sunken text-text-subtle'
            }`}
          >
            {franchie && <CheckCircle2 size={16} aria-hidden="true" />}
            {STATUT_LABELS[s]}
          </li>
        );
      })}
    </ol>
  );
}
