import { useId } from 'react';

/**
 * Seuils de mention — aucun barème officiel de mention n'existe côté
 * métier (seule la note chiffrée /100 est définie, voir
 * GrilleEvaluationForm/GrilleEvaluationProfessionnelleForm) : ces trois
 * paliers sont un choix de présentation, à ajuster si la DFP fixe un
 * barème précis un jour.
 */
const SEUILS_MENTION = [
  { seuil: 80, libelle: 'Excellent', teinte: '#d7a003' }, // ont-gold-600
  { seuil: 65, libelle: 'Très bien', teinte: '#0e6cd5' }, // ont-blue-600
  { seuil: 0, libelle: 'Satisfaisant', teinte: '#7b9d1e' }, // ont-green-600
];

function mentionDe(note) {
  return SEUILS_MENTION.find((m) => note >= m.seuil) ?? SEUILS_MENTION[SEUILS_MENTION.length - 1];
}

/**
 * Médaille de réussite, à la fin de l'évaluation d'un stagiaire — en SVG et
 * non en image : un dégradé et du texte vectoriels s'impriment toujours
 * correctement, contrairement à un fond CSS qui dépend du réglage
 * "graphiques d'arrière-plan" du navigateur (cette carte est imprimable,
 * voir ActionsDfp.jsx::zone-impression-evaluation). Couleurs en valeurs
 * fixes plutôt qu'en tokens de thème : la médaille doit rester identique à
 * l'écran (clair ou sombre) et sur le papier. Seul le ruban change de
 * teinte selon la mention obtenue — la médaille elle-même reste dorée.
 */
export function BadgeReussite({ noteFinale, className = 'h-36 w-36' }) {
  const gradientId = useId();
  const note = Number(noteFinale) || 0;
  const mention = mentionDe(note);

  return (
    <svg
      viewBox="0 0 120 170"
      className={`animate-apparition-badge ${className}`}
      role="img"
      aria-label={`Badge de réussite : ${Math.round(note)} sur 100, mention ${mention.libelle}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbdc83" />
          <stop offset="100%" stopColor="#d7a003" />
        </linearGradient>
      </defs>

      <polygon points="20,100 40,100 40,162 30,150 20,162" fill={mention.teinte} />
      <polygon points="80,100 100,100 100,162 90,150 80,162" fill={mention.teinte} />
      <rect x="18" y="90" width="84" height="26" rx="3" fill={mention.teinte} />

      <circle cx="60" cy="50" r="48" fill={`url(#${gradientId})`} />
      <circle cx="60" cy="50" r="37" fill="#082545" />

      <text x="60" y="61" textAnchor="middle" fontSize="30" fontWeight="700" fill="#ffffff" style={{ fontFamily: 'var(--font-heading)' }}>
        {Math.round(note)}
      </text>
      <text x="60" y="107" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff" style={{ fontFamily: 'var(--font-heading)' }}>
        {mention.libelle}
      </text>
    </svg>
  );
}
