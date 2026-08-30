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
    <div className="space-y-5">
      {SECTIONS_GRILLE.map((section) => (
        <div key={section.cle} className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface-sunken px-4 py-2.5">
            <h4 className="font-heading text-sm font-semibold text-text">{section.titre}</h4>
            <span className="font-mono text-xs font-semibold text-text-muted">
              {sousTotal(section, valeurs)} / {section.bareme}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
            {section.champs.map((champ) => (
              <div key={champ.cle}>
                {readOnly ? (
                  <p className="text-sm">
                    <span className="text-text-subtle">{champ.label} : </span>
                    <span className="font-medium text-text">
                      {valeurs[section.cle]?.[champ.cle] ?? '—'} / {champ.max}
                    </span>
                  </p>
                ) : (
                  <Field label={`${champ.label} (/${champ.max})`} htmlFor={`${section.cle}_${champ.cle}`}>
                    <input
                      id={`${section.cle}_${champ.cle}`}
                      type="number"
                      min="0"
                      max={champ.max}
                      step="0.5"
                      className={inputClass}
                      value={valeurs[section.cle]?.[champ.cle] ?? ''}
                      onChange={(e) => majChamp(section.cle, champ.cle, e.target.value)}
                      required
                    />
                    {champ.suggestion && suggestionAssiduite && (
                      <p className="mt-1 text-xs text-text-subtle">
                        Suggestion d'après les présences : {suggestionAssiduite[champ.suggestion]} / 5 ({suggestionAssiduite.detail})
                      </p>
                    )}
                  </Field>
                )}
              </div>
            ))}
            <div className="sm:col-span-2">
              {readOnly ? (
                valeurs[section.cle]?.justification && (
                  <p className="text-sm italic text-text-muted">
                    « {valeurs[section.cle].justification} »
                  </p>
                )
              ) : (
                <Field label="Justification de l'appréciation" htmlFor={`${section.cle}_justification`}>
                  <textarea
                    id={`${section.cle}_justification`}
                    rows={2}
                    className={inputClass}
                    value={valeurs[section.cle]?.justification ?? ''}
                    onChange={(e) => majChamp(section.cle, 'justification', e.target.value)}
                  />
                </Field>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between rounded-lg bg-ont-blue-50 px-4 py-3 dark:bg-ont-blue-900/20">
        <span className="font-heading text-sm font-semibold text-ont-blue-800 dark:text-ont-blue-300">Total général</span>
        <span className="font-mono text-lg font-bold text-ont-blue-800 dark:text-ont-blue-300">{totalGrille(valeurs)} / 100</span>
      </div>
    </div>
  );
}
