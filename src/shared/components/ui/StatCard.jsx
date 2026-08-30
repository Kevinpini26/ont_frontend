import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';

/*
 * L'icône est toujours un rond neutre bg-ont-blue-50/text-ont-blue-700 (Lot
 * C1) — elle ne porte plus la gravité. La gravité (à surveiller / bloquant)
 * passe désormais par une pastille de couleur devant le libellé, même
 * convention que la zone d'alertes (voir ZoneAlertes.jsx) : `primary`,
 * `neutral` et `success` n'affichent aucune pastille (rien à signaler),
 * `accent` affiche une pastille or, `danger` une pastille rouge.
 */
// gold-700 (pas 500) : vérifié par calcul, ont-gold-500 ne donne que 1,65
// de contraste sur fond clair — bien sous les 3,0 requis pour un élément
// graphique porteur de sens.
const COULEUR_PASTILLE = {
  accent: 'bg-ont-gold-700 dark:bg-ont-gold-500',
  danger: 'bg-ont-red-500',
};

/**
 * `to` : rend la carte entière cliquable (vers la liste filtrée
 * correspondante) — omis, la carte reste un simple encart d'information.
 * `variation` : pourcentage par rapport à la période précédente (null/undefined
 * = non applicable, ex. une jauge à l'instant présent sans équivalent
 * historique fiable — voir StagiaireStatistiqueController). `variationSens`
 * indique si une hausse est un signal positif (par défaut) ou négatif (ex.
 * "en attente depuis longtemps", où une hausse est un mauvais signe).
 */
export function StatCard({ label, value, hint, icon, tone = 'primary', variation, variationSens = 'hausse-positive', to }) {
  const variationVisible = variation !== null && variation !== undefined;
  const variationEstPositive = variationVisible && (variationSens === 'hausse-positive' ? variation >= 0 : variation <= 0);
  const pastille = COULEUR_PASTILLE[tone];
  const Composant = to ? Link : 'div';

  return (
    <Composant
      to={to}
      className={`block rounded-card border border-border bg-surface p-5 transition-[transform,box-shadow] ${
        to ? 'hover:-translate-y-0.5 hover:shadow-card' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ont-blue-50 text-ont-blue-700 dark:bg-ont-blue-950/40 dark:text-ont-blue-300">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-label font-medium uppercase tracking-wide text-text-subtle">
            {pastille && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pastille}`} aria-hidden="true" />}
            {label}
          </p>
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
    </Composant>
  );
}
