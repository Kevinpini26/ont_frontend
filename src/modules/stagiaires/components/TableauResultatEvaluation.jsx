import { Fragment } from 'react';
import { TableWrap, tableClass, theadClass, thClass, tbodyClass, tdClass } from '../../../shared/components/ui/Table';
import { BadgeReussite } from './BadgeReussite';

function moyenne(a, b) {
  return Math.round(((a + b) / 2) * 10) / 10;
}

/**
 * Reprend fidèlement la structure de la grille papier ONT (catégorie par
 * catégorie, rubrique par rubrique), avec les deux évaluations — direction
 * et DFP — côte à côte, plus une colonne Moyenne calculée automatiquement à
 * chaque niveau (rubrique, sous-total, total général), pour permettre une
 * retranscription manuelle directe sur la fiche physique sans le moindre
 * calcul à la charge de l'agent. `sections` est SECTIONS_GRILLE (académique)
 * ou SECTIONS_GRILLE_PRO (professionnel), voir GrilleEvaluationForm.jsx /
 * GrilleEvaluationProfessionnelleForm.jsx — jamais redéfinie ici.
 */
export function TableauResultatEvaluation({ sections, grilleDirection, grilleDfp, totalDirection, totalDfp, noteFinale }) {
  return (
    <div className="space-y-4">
      <TableWrap>
        <table className={tableClass}>
          <thead className={theadClass}>
            <tr>
              <th className={thClass}>Rubrique</th>
              <th className={`${thClass} text-right`}>Direction</th>
              <th className={`${thClass} text-right`}>DFP</th>
              <th className={`${thClass} text-right`}>Moyenne</th>
            </tr>
          </thead>
          <tbody className={tbodyClass}>
            {sections.map((section) => {
              const bareme = section.bareme ?? section.champs.length * 10;
              const sousTotalDirection = section.champs.reduce(
                (somme, champ) => somme + Number(grilleDirection?.[section.cle]?.[champ.cle] || 0),
                0,
              );
              const sousTotalDfp = section.champs.reduce(
                (somme, champ) => somme + Number(grilleDfp?.[section.cle]?.[champ.cle] || 0),
                0,
              );

              return (
                <Fragment key={section.cle}>
                  <tr className="bg-surface-sunken">
                    <td colSpan={4} className={`${tdClass} font-heading font-semibold text-text`}>
                      {section.titre} <span className="font-mono text-xs font-normal text-text-subtle">/ {bareme}</span>
                    </td>
                  </tr>
                  {section.champs.map((champ) => {
                    const valDirection = Number(grilleDirection?.[section.cle]?.[champ.cle] ?? 0);
                    const valDfp = Number(grilleDfp?.[section.cle]?.[champ.cle] ?? 0);
                    const max = champ.max ?? 10;
                    return (
                      <tr key={champ.cle}>
                        <td className={tdClass}>{champ.label}</td>
                        <td className={`${tdClass} text-right font-mono`}>
                          {grilleDirection?.[section.cle]?.[champ.cle] ?? '—'} / {max}
                        </td>
                        <td className={`${tdClass} text-right font-mono`}>
                          {grilleDfp?.[section.cle]?.[champ.cle] ?? '—'} / {max}
                        </td>
                        <td className={`${tdClass} text-right font-mono font-semibold`}>
                          {moyenne(valDirection, valDfp)} / {max}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <td className={tdClass}>Sous-total</td>
                    <td className={`${tdClass} text-right font-mono`}>{sousTotalDirection} / {bareme}</td>
                    <td className={`${tdClass} text-right font-mono`}>{sousTotalDfp} / {bareme}</td>
                    <td className={`${tdClass} text-right font-mono`}>{moyenne(sousTotalDirection, sousTotalDfp)} / {bareme}</td>
                  </tr>
                </Fragment>
              );
            })}
            <tr className="bg-ont-blue-50 font-bold dark:bg-ont-blue-950/60">
              <td className={tdClass}>Total général</td>
              <td className={`${tdClass} text-right font-mono`}>{totalDirection} / 100</td>
              <td className={`${tdClass} text-right font-mono`}>{totalDfp} / 100</td>
              <td className={`${tdClass} text-right font-mono text-ont-blue-800 dark:text-ont-blue-300`}>{noteFinale} / 100</td>
            </tr>
          </tbody>
        </table>
      </TableWrap>

      <div className="flex items-center justify-between gap-4 rounded-lg bg-ont-blue-50 px-5 py-4 dark:bg-ont-blue-950/60">
        <div>
          <span className="font-heading text-base font-semibold text-ont-blue-800 dark:text-ont-blue-300">Moyenne finale</span>
          <p className="font-mono text-2xl font-bold text-ont-blue-800 dark:text-ont-blue-300">{noteFinale} / 100</p>
        </div>
        <BadgeReussite noteFinale={noteFinale} className="h-28 w-28 shrink-0" />
      </div>
    </div>
  );
}
