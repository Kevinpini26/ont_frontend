import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '../../../../shared/components/ui/Badge';
import { DEGRE_URGENCE_LABELS, TONE_URGENCE } from '../../constants';

/**
 * Le rouge est réservé au niveau 3 d'en-souffrance, l'or au niveau 1-2 —
 * rien d'autre (choix confirmé, voir docs/questions-ont.md) : "le rouge
 * veut dire bloqué, l'or veut dire à surveiller".
 */
function ToneSouffrance({ niveau }) {
  if (!niveau) return null;
  const tone = niveau >= 3 ? 'danger' : 'warning';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${niveau >= 3 ? 'text-ont-red-700 dark:text-ont-red-300' : 'text-ont-gold-700 dark:text-ont-gold-400'}`}>
      <AlertTriangle size={13} aria-hidden="true" />
      {niveau >= 3 ? 'Bloqué' : 'À surveiller'}
    </span>
  );
}

/**
 * File de dossiers d'une bannette — colonne médiane (~420px, voir
 * PosteDeTravail.jsx). La navigation j/k/flèches (voir useRaccourcisClavier
 * dans la page appelante) déplace `selectionneId` ; ce composant se
 * contente de scroller la ligne active dans la vue et de refléter l'état,
 * jamais de posséder lui-même la position (state levé dans la page, pour
 * que la persistance de travail — correction #4 — puisse la sauvegarder).
 */
export function FileDossiers({ dossiers, selectionneId, onSelectionner, enSouffranceParId, selectionLot, onBasculerLot, permetLot }) {
  const ligneActiveRef = useRef(null);

  useEffect(() => {
    ligneActiveRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectionneId]);

  if (dossiers.length === 0) {
    return <p className="p-4 text-sm text-text-subtle">Rien dans cette bannette.</p>;
  }

  return (
    <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
      {dossiers.map((d) => {
        const estSelectionne = d.id === selectionneId;
        const niveau = enSouffranceParId?.get(d.id);
        return (
          <li key={d.id} ref={estSelectionne ? ligneActiveRef : undefined}>
            <div
              role="button"
              tabIndex={-1}
              onClick={() => onSelectionner(d.id)}
              aria-current={estSelectionne ? 'true' : undefined}
              className={`flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm ${
                estSelectionne ? 'bg-ont-blue-50 dark:bg-ont-blue-950' : 'hover:bg-surface-sunken'
              }`}
            >
              {permetLot && d.en_transit && (
                <input
                  type="checkbox"
                  className="mt-1 shrink-0"
                  checked={selectionLot?.has(d.id) ?? false}
                  onChange={(e) => {
                    e.stopPropagation();
                    onBasculerLot(d.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Sélectionner ${d.numero_accuse_reception} pour un traitement par lot`}
                />
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-text">{d.numero_accuse_reception}</span>
                  {d.degre_urgence && <Badge tone={TONE_URGENCE[d.degre_urgence]}>{DEGRE_URGENCE_LABELS[d.degre_urgence]}</Badge>}
                </div>
                <p className="truncate text-text-muted">{d.objet}</p>
                {niveau > 0 && <ToneSouffrance niveau={niveau} />}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
