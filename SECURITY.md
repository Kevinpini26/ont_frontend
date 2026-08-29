# Politique de sécurité — ONT Frontend

Le modèle de menaces complet (moissonnage, bruteforce, sauvegardes,
données personnelles traitées, procédure de signalement) est documenté
dans `SECURITY.md` du dépôt `ont-system-backend` — ce fichier ne couvre
que les points spécifiques à cette SPA React.

## Points traités côté frontend

- **Jeton d'authentification** : transmis uniquement via l'en-tête
  `Authorization` (jamais en query string ni en cookie), stocké en
  `sessionStorage` plutôt que `localStorage` — ne survit pas à la
  fermeture de l'onglet ni ne se partage entre onglets. Reste lisible par
  du JavaScript en cas de XSS dans les deux cas : une protection complète
  demanderait un cookie `HttpOnly` émis par le backend, ce qui impliquerait
  de faire basculer Sanctum en mode SPA à cookies (CSRF, credentials,
  domaines "stateful") — compromis assumé, pas fait ici.
- **Pas de `dangerouslySetInnerHTML`** dans tout le projet — le contenu
  riche des courriers (TipTap) est stocké et rendu comme document JSON
  structuré, jamais comme HTML injecté.
- **Échappement systématique** du contenu utilisateur dans les exports
  (`ExportButtons.jsx` — CSV/PDF).
- **Déconnexion automatique** avant expiration du jeton (avertissement
  deux minutes avant, voir `useSessionExpiryWatcher`), plutôt qu'un 401
  brutal en pleine saisie.

## Avant mise en ligne

- `VITE_API_BASE_URL` doit pointer vers l'API en HTTPS.
- Servir ce build derrière HTTPS uniquement (voir le guide d'installation
  et la configuration nginx fournie).
- Les en-têtes de sécurité HTTP (CSP, X-Frame-Options...) sur les
  réponses de l'API sont déjà posés côté backend ; la CSP effective pour
  cette SPA elle-même (fichiers HTML/JS servis par nginx) est à
  configurer au niveau du reverse proxy, voir le guide d'installation.

## Signalement

Voir la procédure du dépôt backend — jamais par un canal public.
