import { TrendingDown, TrendingUp } from 'lucide-react';

/*
 * TONES sera repris en Lot C1 (icône dans un rond ont-blue-50/ont-blue-700
 * plutôt qu'un carré de couleur pleine) — ici uniquement la correction des
 * jetons de couleur et des contrastes, pas la refonte de forme.
 */
const TONES = {
  primary: 'bg-ont-blue-700 text-white',
  // Texte ont-blue-950, jamais blanc (2,03 de contraste seulement) — voir Button.
  accent: 'bg-ont-gold-400 text-ont-blue-950',
  neutral: 'bg-gray-700 text-white',
  success: 'bg-ont-green-600 text-white',
  danger: 'bg-ont-red-500 text-white',
};

/**
 * `variation` : pourcentage par rapport à la période précédente (null/undefined
 * = non applicable, ex. une jauge à l'instant présent sans équivalent
 * historique fiable — voir StagiaireStatistiqueController). `variationSens`
 * indique si une hausse est un signal positif (par défaut) ou négatif (ex.
 * "en attente depuis longtemps", où une hausse est un mauvais signe).
 */
export function StatCard({ label, value, hint, icon, tone = 'primary', variation, variationSens = 'hausse-positive' }) {
  const variationVisible = variation !== null && variation !== undefined;
  const variationEstPositive = variationVisible && (variationSens === 'hausse-positive' ? variation >= 0 : variation <= 0);

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <div className="flex items-start gap-4">
        {icon && (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-field ${TONES[tone]}`}>{icon}</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-label font-medium uppercase tracking-wide text-text-subtle">{label}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <p className="text-stat font-semibold tracking-tight text-text tabular-nums">{value}</p>
            {variationVisible && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${
                  variationEstPositive ? 'text-ont-green-600 dark:text-ont-green-400' : 'text-ont-red-700 dark:text-ont-red-300'
                }`}
              >
                {variation >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Math.abs(variation)}%
              </span>
            )}
          </div>
          {hint && <p className="mt-0.5 text-label text-text-subtle">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
