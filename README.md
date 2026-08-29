# ONT — Frontend

Interface web du Système d'information de l'Office National du Tourisme de la
RDC : SPA React 19 + Vite, consommant l'API REST du dossier `backend/`.

## Stack

- **React 19 + Vite**, JavaScript (pas TypeScript).
- **Tailwind CSS v4** (`@tailwindcss/vite`) pour l'intégralité du style —
  aucune feuille de style écrite à la main en dehors de `src/index.css`
  (import Tailwind + palette de couleurs institutionnelle + quelques réglages
  globaux non exprimables en classes utilitaires, ex. `accent-color`).
- **Zustand** (+ middleware `persist`, backé par `sessionStorage` plutôt que
  `localStorage` — le jeton ne survit pas à la fermeture de l'onglet ni ne se
  partage entre onglets) pour l'état d'authentification global.
- **react-router-dom v7** pour le routage, avec gardes par rôle/poste
  (`ProtectedRoute`).
- **@tiptap/react** pour l'édition de texte riche (projet de réponse d'un
  courrier) — le contenu est stocké/rechargé comme document JSON structuré,
  jamais comme HTML injecté.
- **recharts** pour les graphiques des tableaux de bord.
- **axios** avec intercepteurs (attache le jeton Sanctum, gère les 401).

## Structure

```
src/
  modules/
    kernel/       # auth, directions, utilisateurs, journal d'audit
    courrier/     # circuit courrier, files d'attente, éditeur TipTap
    stagiaires/   # cycle de vie stagiaire, dashboard DFP
    public/       # vérification de dossier (sans authentification)
  shared/
    api/          # client axios, notifications
    components/   # AppLayout, Sidebar, ProtectedRoute, ErrorBoundary...
    components/ui/  # design system Tailwind réutilisable (Button, Card,
                     # Badge, Alert, EmptyState, StatCard, Table, Field...)
    hooks/        # useRequete (fetch + AbortController), useFocusTrap,
                   # useSessionExpiryWatcher, useConfirm...
    navigation.js  # source unique de la sidebar par rôle/poste
```

Chaque module frontend miroir son homologue backend, plus `shared/` pour le
transverse (mêmes conventions que le backend modulaire).

## Installation

```bash
npm install
npm run dev       # http://localhost:5173, attend le backend sur :8000
npm run build      # build de production dans dist/
```

Le client API (`src/shared/api/client.js`) lit `VITE_API_BASE_URL` (aucune
valeur en dur dans le code) — copier `.env.example` en `.env`
(`VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1` par défaut) et l'adapter à
l'environnement cible.

## Tests

```bash
npm run test    # vitest run
npm run lint    # oxlint
```

Vitest + `@testing-library/react` (nettoyage du DOM entre tests explicite via
`afterEach(cleanup)` dans `src/setupTests.js` — Vitest, contrairement à Jest,
ne le fait pas automatiquement). Chaque page est chargée en `React.lazy` +
`Suspense`/`ErrorBoundary` (`src/App.jsx`) : le chunk initial (`index-*.js`,
servi depuis `dist/index.html`) reste sous 350 kB avant gzip — l'éditeur
TipTap et les graphiques `recharts`, bien plus lourds, ne sont chargés qu'à
la navigation vers une page qui en a besoin. La CI vérifie ce budget après
`npm run build` (`.github/workflows/ci.yml`), pas `npm run build` lui-même.

## Design system

Palette définie dans `src/index.css` via `@theme` (Tailwind v4) :
- `ont-blue-*` : bleu institutionnel (identité ONT/administration).
- `ont-gold-*` : or/ocre, utilisé avec parcimonie (identité tourisme — soleil
  du logo).
- `ont-green-*` : statuts positifs ("validé", "clôturé", "présent").
- `ont-purple-*` : accent secondaire, usage ponctuel.
- Le reste (gris, alerte/erreur) vient de la palette Tailwind standard
  (`slate`, `rose`).

Composants réutilisables dans `shared/components/ui/` : privilégier leur usage
à toute classe Tailwind ad hoc répétée sur plusieurs pages.

## Navigation par rôle

`shared/navigation.js` est la source unique de vérité de la sidebar : chaque
rôle (administrateur, agent DFP, responsable de direction, agent de circuit
courrier) n'y voit que ses propres sections. Le routage (`App.jsx`) applique
séparément les gardes d'accès (`ProtectedRoute`) — les deux doivent rester
cohérents si un nouveau rôle ou une nouvelle page est ajoutée.

## Sécurité

Voir `SECURITY.md` à la racine du dépôt. Points spécifiques au frontend :
aucun usage de `dangerouslySetInnerHTML`, échappement systématique du contenu
utilisateur dans l'export PDF de listes (`ExportButtons.jsx`), jeton Sanctum
transmis uniquement via l'en-tête `Authorization` (jamais en query string ni en
cookie).
