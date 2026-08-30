/**
 * Silhouette monochrome de l'antilope du logo (voir public/ONT.png) — un
 * seul <path>, `fill="currentColor"` pour hériter la couleur/opacité de
 * l'appelant (voir EmptyState, à 8% d'opacité). Simplifiée à dessein pour
 * rester lisible en aplat à cette opacité : silhouette debout, tête levée,
 * corne balayée vers l'arrière, pas un décalque fidèle du logo complet.
 */
export function AntilopeSilhouette({ className = 'h-32 w-32' }) {
  return (
    <svg viewBox="0 0 200 170" fill="currentColor" className={className} aria-hidden="true">
      <path
        d="
          M 132 16
          C 126 8, 115 7, 108 13
          C 113 15, 117 19, 117 24
          C 108 21, 100 25, 97 33
          C 94 41, 97 49, 104 54
          L 98 58
          C 86 51, 71 49, 58 53
          C 47 57, 39 65, 37 76
          C 36 83, 38 89, 43 93
          L 38 95
          C 31 97, 25 102, 22 109
          L 28 112
          C 31 106, 36 101, 42 99
          L 46 99
          L 46 150
          L 55 150
          L 55 101
          L 68 101
          L 68 153
          L 77 153
          L 77 101
          L 94 100
          L 99 148
          L 108 147
          L 103 99
          C 116 96, 127 88, 133 77
          C 138 68, 140 58, 137 48
          L 146 43
          C 150 41, 152 36, 151 32
          L 143 34
          C 142 29, 138 24, 132 23
          C 137 20, 137 16, 136 13
          Z
        "
      />
    </svg>
  );
}
