import { useEffect, useRef } from 'react';

/**
 * Grille d'évaluation officielle ONT — stage professionnel. Dix rubriques
 * réparties en trois catégories, chacune notée sur 10 (voir
 * GrilleEvaluationProfessionnelle.php côté backend, source de vérité pour
 * le calcul du total). Distincte de GrilleEvaluationForm.jsx (stage
 * académique) — jamais rendues ensemble, voir StagiaireDetailPage.jsx.
 */
export const SECTIONS_GRILLE_PRO = [
  {
    cle: 'aspects_intellectuels',
    titre: 'I. Aspects intellectuels',
    champs: [
      { cle: 'connaissance_metier', label: 'Connaissance du métier' },
      { cle: 'esprit_initiative_responsabilite', label: "Esprit d'initiative et sens de responsabilité" },
      { cle: 'capacite_ecoute_communication', label: "Capacité d'écoute, de communication, compréhension et d'exécution" },
    ],
  },
  {
    cle: 'aspects_humains',
    titre: 'II. Aspects humains',
    champs: [
      { cle: 'assiduite_discipline', label: 'Assiduité et discipline' },
      { cle: 'relation_interpersonnelle', label: 'Relation interpersonnelle et collaboration' },
      { cle: 'ponctualite_regularite', label: 'Ponctualité et régularité', suggestion: true },
      { cle: 'presentation_contacts', label: 'Présentation et contacts' },
    ],
  },
  {
    cle: 'aspects_professionnels',
    titre: 'III. Aspects professionnels',
    champs: [
      { cle: 'efficacite_rendement', label: 'Efficacité, rendement et connaissance du métier' },
      { cle: 'capacite_innovation', label: "Capacité d'innovation" },
      { cle: 'maitrise_langue', label: 'Maîtrise de la langue du travail' },
    ],
  },
];

export function grilleProVide() {
  const grille = {};
  for (const section of SECTIONS_GRILLE_PRO) {
    grille[section.cle] = {};
    for (const champ of section.champs) {
      grille[section.cle][champ.cle] = '';
    }
  }
  return grille;
}

function sousTotal(section, valeurs) {
  return section.champs.reduce((somme, champ) => somme + Number(valeurs[section.cle]?.[champ.cle] || 0), 0);
}

export function totalGrillePro(valeurs) {
  return SECTIONS_GRILLE_PRO.reduce((somme, section) => somme + sousTotal(section, valeurs), 0);
}

export function GrilleEvaluationProfessionnelleForm({ valeurs, onChange, suggestionAssiduite, readOnly = false }) {
  const suggestionAppliquee = useRef(false);

  useEffect(() => {
    if (readOnly || suggestionAppliquee.current || !suggestionAssiduite) return;
    const humains = valeurs.aspects_humains ?? {};
    if (humains.ponctualite_regularite !== '') return;

    suggestionAppliquee.current = true;
    onChange({
      ...valeurs,
      aspects_humains: {
        ...humains,
        ponctualite_regularite: suggestionAssiduite.ponctualite + suggestionAssiduite.regularite,
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

  const total = totalGrillePro(valeurs);

  return (
    <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-border">
      {SECTIONS_GRILLE_PRO.map((section) => (
        <div key={section.cle} className="border-b border-border last:border-b-0">
          <div className="flex items-center justify-between bg-surface-sunken px-4 py-2.5">
            <h4 className="font-heading text-sm font-semibold text-text">{section.titre}</h4>
            <span className="font-mono text-xs font-semibold tabular-nums text-text-muted">
              {sousTotal(section, valeurs)} / {section.champs.length * 10}
            </span>
          </div>
          <div className="divide-y divide-border">
            {section.champs.map((champ) => {
              const id = `${section.cle}_${champ.cle}`;
              const valeur = valeurs[section.cle]?.[champ.cle] ?? '';

              if (readOnly) {
                return (
                  <p key={champ.cle} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                    <span className="text-text-subtle">{champ.label}</span>
                    <span className="shrink-0 font-mono font-medium tabular-nums text-text">{valeur || '—'} / 10</span>
                  </p>
                );
              }

              return (
                <div key={champ.cle} className="px-4 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label htmlFor={id} className="text-sm text-text">
                      {champ.label} (/10)
                    </label>
                    <div className="flex shrink-0 items-center gap-3">
                      <input
                        type="range"
                        aria-hidden="true"
                        tabIndex={-1}
                        min="0"
                        max="10"
                        step="0.5"
                        value={valeur === '' ? 0 : valeur}
                        onChange={(e) => majChamp(section.cle, champ.cle, e.target.value)}
                        className="w-24 accent-ont-blue-600 sm:w-32"
                      />
                      <input
                        id={id}
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={valeur}
                        onChange={(e) => majChamp(section.cle, champ.cle, e.target.value)}
                        required
                        className="w-16 rounded-field border border-border-strong bg-surface px-2 py-1 text-right font-mono text-sm tabular-nums text-text"
                      />
                    </div>
                  </div>
                  {champ.suggestion && suggestionAssiduite && (
                    <p className="mt-1 text-xs text-text-subtle">
                      Suggestion d'après les présences : {suggestionAssiduite.ponctualite + suggestionAssiduite.regularite} / 10 (
                      {suggestionAssiduite.detail})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border-strong bg-ont-blue-50 px-4 py-3 dark:bg-ont-blue-900/90">
        <span className="font-heading text-sm font-semibold text-ont-blue-800 dark:text-ont-blue-200">Total général</span>
        <span className="font-mono text-lg font-bold tabular-nums text-ont-blue-800 dark:text-ont-blue-200">
          {total} / 100 ({total}%)
        </span>
      </div>
    </div>
  );
}
