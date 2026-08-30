import { useEffect, useRef } from 'react';
import { Field, inputClass } from '../../../shared/components/ui/Field';

/**
 * Grille d'évaluation officielle ONT — mêmes intitulés, mêmes barèmes, mêmes
 * regroupements que la grille papier, reproduite à l'identique pour la
 * direction d'accueil et pour la DFP (voir GrilleEvaluation.php côté
 * backend, source de vérité pour le calcul du total — celui affiché ici
 * n'est qu'un aperçu, toujours recalculé côté serveur).
 */
export const SECTIONS_GRILLE = [
  {
    cle: 'aptitudes_professionnelles',
    titre: 'Aptitudes professionnelles',
    bareme: 50,
    champs: [
      { cle: 'connaissance_metier', label: 'Connaissance du métier', max: 10 },
      { cle: 'esprit_initiative', label: "Esprit d'initiative", max: 10 },
      { cle: 'sens_responsabilite', label: 'Sens de responsabilité', max: 10 },
      { cle: 'soin_proprete', label: 'Soin et propreté dans le travail', max: 10 },
      { cle: 'rendement', label: 'Rendement', max: 10 },
    ],
  },
  {
    cle: 'relations_humaines',
    titre: 'Relations Humaines',
    bareme: 30,
    champs: [
      { cle: 'esprit_equipe', label: "Esprit d'équipe", max: 10 },
      { cle: 'communication', label: 'Communication', max: 10 },
      { cle: 'relations_sociales', label: 'Relations sociales', max: 10 },
    ],
  },
  {
    cle: 'presentation',
    titre: 'Présentation',
    bareme: 20,
    champs: [
      { cle: 'discipline', label: 'Discipline', max: 5 },
      { cle: 'ponctualite', label: 'Ponctualité', max: 5, suggestion: 'ponctualite' },
      { cle: 'regularite', label: 'Régularité', max: 5, suggestion: 'regularite' },
      { cle: 'tenue', label: 'Tenue', max: 5 },
    ],
  },
];

export function grilleVide() {
  const grille = {};
  for (const section of SECTIONS_GRILLE) {
    grille[section.cle] = { justification: '' };
    for (const champ of section.champs) {
      grille[section.cle][champ.cle] = '';
    }
  }
  return grille;
}

function sousTotal(section, valeurs) {
  return section.champs.reduce((somme, champ) => somme + Number(valeurs[section.cle]?.[champ.cle] || 0), 0);
}

export function totalGrille(valeurs) {
  return SECTIONS_GRILLE.reduce((somme, section) => somme + sousTotal(section, valeurs), 0);
}

export function GrilleEvaluationForm({ valeurs, onChange, suggestionAssiduite, readOnly = false }) {
  const suggestionAppliquee = useRef(false);

  useEffect(() => {
    if (readOnly || suggestionAppliquee.current || !suggestionAssiduite) return;
    const presentation = valeurs.presentation ?? {};
    if (presentation.ponctualite !== '' || presentation.regularite !== '') return;

    suggestionAppliquee.current = true;
    onChange({
      ...valeurs,
      presentation: {
        ...presentation,
        ponctualite: suggestionAssiduite.ponctualite,
        regularite: suggestionAssiduite.regularite,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionAssiduite]);

  function majChamp(sectionCle, champCle, valeur) {
    onChange({
      ...valeurs,
      [sectionCle]: { ...valeurs[sectionCle], [champCle]: valeur },
    });
  }

  return (
    // max-h + overflow-y-auto : un conteneur de défilement propre à cette
    // grille, pour que "sticky bottom-0" sur le total général le colle
    // réellement au bas de CETTE zone pendant la saisie (un sticky au bout
    // d'un fragment de page normale n'a rien à dépasser, donc rien à coller).
    <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-border">
      {SECTIONS_GRILLE.map((section) => (
        <div key={section.cle} className="border-b border-border last:border-b-0">
          <div className="flex items-center justify-between bg-surface-sunken px-4 py-2.5">
            <h4 className="font-heading text-sm font-semibold text-text">{section.titre}</h4>
            <span className="font-mono text-xs font-semibold tabular-nums text-text-muted">
              {sousTotal(section, valeurs)} / {section.bareme}
            </span>
          </div>
          <div className="divide-y divide-border">
            {section.champs.map((champ) => (
              <RubriqueLigne
                key={champ.cle}
                id={`${section.cle}_${champ.cle}`}
                label={champ.label}
                max={champ.max}
                valeur={valeurs[section.cle]?.[champ.cle] ?? ''}
                onChange={(v) => majChamp(section.cle, champ.cle, v)}
                readOnly={readOnly}
                suggestion={
                  champ.suggestion && suggestionAssiduite
                    ? `Suggestion d'après les présences : ${suggestionAssiduite[champ.suggestion]} / 5 (${suggestionAssiduite.detail})`
                    : null
                }
              />
            ))}
            <div className="px-4 py-3">
              {readOnly ? (
                valeurs[section.cle]?.justification && (
                  <p className="text-sm italic text-text-muted">« {valeurs[section.cle].justification} »</p>
                )
              ) : (
                <Field label="Justification de l'appréciation" htmlFor={`${section.cle}_justification`}>
                  <TextareaAutoExtensible
                    id={`${section.cle}_justification`}
                    value={valeurs[section.cle]?.justification ?? ''}
                    onChange={(v) => majChamp(section.cle, 'justification', v)}
                  />
                </Field>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border-strong bg-ont-blue-50 px-4 py-3 dark:bg-ont-blue-900/90">
        <span className="font-heading text-sm font-semibold text-ont-blue-800 dark:text-ont-blue-200">Total général</span>
        <span className="font-mono text-lg font-bold tabular-nums text-ont-blue-800 dark:text-ont-blue-200">{totalGrille(valeurs)} / 100</span>
      </div>
    </div>
  );
}

/**
 * Une rubrique par ligne, curseur à droite — plus rapide à parcourir que
 * des champs numériques empilés en grille, et le curseur rend visible d'un
 * coup d'œil où se situe la note sur le barème.
 */
export function RubriqueLigne({ id, label, max, valeur, onChange, readOnly, suggestion }) {
  if (readOnly) {
    return (
      <p className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
        <span className="text-text-subtle">{label}</span>
        <span className="shrink-0 font-mono font-medium tabular-nums text-text">
          {valeur === '' ? '—' : valeur} / {max}
        </span>
      </p>
    );
  }

  return (
    <div className="px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-text">
          {label}
        </label>
        <div className="flex shrink-0 items-center gap-3">
          {/* Curseur visuel — reflète la note, mais reste secondaire : le
              champ numérique ci-dessous porte le label et la saisie au
              clavier, plus précise qu'un glisser-déposer pour une note au
              demi-point près. */}
          <input
            type="range"
            aria-hidden="true"
            tabIndex={-1}
            min="0"
            max={max}
            step="0.5"
            value={valeur === '' ? 0 : valeur}
            onChange={(e) => onChange(e.target.value)}
            className="w-24 accent-ont-blue-600 sm:w-32"
          />
          <input
            id={id}
            type="number"
            min="0"
            max={max}
            step="0.5"
            value={valeur}
            onChange={(e) => onChange(e.target.value)}
            required
            className="w-16 rounded-field border border-border-strong bg-surface px-2 py-1 text-right font-mono text-sm tabular-nums text-text"
          />
          <span className="shrink-0 text-xs text-text-subtle">/ {max}</span>
        </div>
      </div>
      {suggestion && <p className="mt-1 text-xs text-text-subtle">{suggestion}</p>}
    </div>
  );
}

/** Textarea qui grandit avec son contenu — pas de barre de défilement interne à gérer pour une justification qui déborde de 2 lignes. */
export function TextareaAutoExtensible({ id, value, onChange }) {
  return (
    <textarea
      id={id}
      rows={2}
      className={`${inputClass} resize-none overflow-hidden`}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
      ref={(el) => {
        if (el && el.scrollHeight > el.clientHeight) el.style.height = `${el.scrollHeight}px`;
      }}
    />
  );
}
