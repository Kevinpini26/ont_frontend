import { BarChart3, Building2, CalendarCheck, ClipboardList, Clock, FileClock, History, Inbox, LayoutDashboard, Mail, ScanLine, ScrollText, Settings, Target, Users } from 'lucide-react';
import { estDirecteurDirection, ROLES } from '../modules/kernel/constants';

/**
 * Sections de la sidebar par rôle : chaque agent ne voit que les entrées
 * pertinentes pour son périmètre (poste du circuit courrier, direction,
 * DFP, administration). Point unique de vérité pour la navigation, gardé
 * volontairement séparé du routing (App.jsx) pour rester lisible.
 */
export function navigationForUser(user) {
  if (!user) return [];
  if (user.poste_delegue === 'dg' && user.poste !== 'dg') {
    return [
      ...navigationForUser({ ...user, poste_delegue: null }),
      { title: 'Autorité DG', items: [
        { label: 'File DG', to: '/circuit/dg', icon: Inbox },
        { label: 'Espace Direction Générale', to: '/circuit/espace-dg', icon: Building2 },
      ] },
    ];
  }

  if (user.role === ROLES.ADMINISTRATEUR) {
    return [
      {
        title: 'Administration',
        items: [
          { label: 'Directions', to: '/admin/directions', icon: Building2 },
          { label: 'Utilisateurs', to: '/admin/utilisateurs', icon: Users },
          { label: 'Délégations', to: '/admin/delegations', icon: Users },
          { label: "Journal d'audit", to: '/admin/journal-audit', icon: ScrollText },
          { label: 'Rapports', to: '/admin/rapports', icon: LayoutDashboard },
          { label: "Import d'historique", to: '/admin/import-historique', icon: History },
        ],
      },
    ];
  }

  if (user.role === ROLES.AGENT_DFP) {
    return [
      {
        title: 'Aperçu',
        items: [{ label: 'Tableau de bord', to: '/stagiaires/dashboard', icon: LayoutDashboard }],
      },
      {
        title: 'Stagiaires',
        items: [
          { label: 'Stagiaires', to: '/stagiaires/actifs', icon: Users },
          { label: 'Demandes de stage', to: '/stagiaires/demandes', icon: FileClock, countKey: 'demandes_stage' },
          { label: 'Tableaux de répartition', to: '/tableaux-repartition', icon: ClipboardList },
          { label: 'Présences', to: '/stagiaires/presences', icon: CalendarCheck },
          { label: 'Dossiers en souffrance', to: '/stagiaires/en-souffrance', icon: Clock },
          { label: 'Historique', to: '/stagiaires/historique', icon: History },
        ],
      },
      {
        title: 'Courrier',
        items: [{ label: 'Courrier', to: '/stagiaires/courrier', icon: Mail, countKey: 'courriers_recus' }],
      },
      {
        title: 'Pilotage',
        items: [
          { label: 'Statistiques', to: '/stagiaires/statistiques', icon: BarChart3 },
          { label: 'Paramètres', to: '/stagiaires/parametres', icon: Settings },
        ],
      },
    ];
  }

  if (estDirecteurDirection(user)) {
    return [
      {
        title: 'Ma direction',
        items: [
          { label: 'Tableau de bord', to: '/direction/tableau-de-bord', icon: LayoutDashboard },
          { label: 'Courrier', to: '/direction/courrier', icon: Mail, countKey: 'courriers_recus' },
          { label: 'Courriers à traiter', to: '/direction/courriers-a-traiter', icon: Inbox },
          { label: 'Stagiaires', to: '/direction/stagiaires', icon: Users },
        ],
      },
    ];
  }

  if (user.role === ROLES.SECRETARIAT_DIRECTION) {
    return [
      {
        title: 'Ma direction',
        items: [
          { label: 'Courrier', to: '/direction/courrier', icon: Mail, countKey: 'courriers_recus' },
          { label: 'Courriers dispatchés', to: '/direction/courriers-recus', icon: Inbox },
          { label: 'Documents de retour', to: '/direction/courriers-a-traiter', icon: ClipboardList },
        ],
      },
    ];
  }

  if (user.role === ROLES.AGENT_CIRCUIT_COURRIER || user.poste_delegue === 'dg') {
    const poste = user.poste_delegue === 'dg' ? 'dg' : user.poste;
    // Un compte encore affecté à l'ancien poste reste lisible dans
    // l'administration, mais ne reçoit plus aucun accès opérationnel.
    if (['protocole', 'assistant_protocole'].includes(poste)) return [];

    const items = [{ label: 'Ma file de traitement', to: `/circuit/${poste}`, icon: Inbox }];

    if (poste !== 'assistant_dga') {
      items.push({ label: 'Tableau de bord', to: '/circuit/tableau-de-bord', icon: LayoutDashboard });
    }

    if (['assistant_1', 'assistant_2', 'assistant_dga'].includes(user.poste)) {
      items[0] = { label: 'Mes missions', to: '/circuit/missions', icon: ClipboardList };
    }
    if (user.poste === 'secretariat_2') {
      items[0] = { label: 'Centre de dispatch', to: '/circuit/centre-dispatch', icon: Inbox };
      items.push({ label: 'Envois officiels', to: '/circuit/envois-officiels', icon: Inbox });
      items.push({ label: 'Archivage des dossiers', to: '/circuit/archivage-dossiers', icon: FileClock });
      items.push({ label: 'Classement & archives', to: '/circuit/classement-archives', icon: FileClock });
    }

    // La DG dispose en plus d'un espace consolidé transverse, distinct de
    // sa simple file de traitement.
    if (poste === 'dg') {
      items.push({ label: 'Espace Direction Générale', to: '/circuit/espace-dg', icon: Building2 });
    }

    // Lot 4 : seuls la Réception (présente à la DG) et la DG/DGA (rendent
    // l'avis) ont une action réelle sur un tableau — les autres postes
    // centraux ne le voient pas dans la navigation (accès direct par lien
    // toujours possible, backend-gated).
    if (['reception', 'dg', 'dga'].includes(user.poste)) {
      items.push({ label: 'Tableaux de répartition', to: '/tableaux-repartition', icon: ClipboardList });
    }

    // Numérisation (voir docs/numerisation-courrier.md) : réservée à la
    // Réception (poste qui scanne), même périmètre que
    // CourrierRattrapageNumerisationController::index() côté serveur.
    if (user.poste === 'reception') {
      items.push({ label: 'Documents à numériser', to: '/circuit/a-numeriser', icon: ScanLine });
      items.push({ label: 'Documents internes reçus', to: '/circuit/documents-internes', icon: Mail });
    }

    // Lot C : la statistique de justesse du tri n'a de sens que pour
    // celui qui trie.
    if (user.poste === 'secretariat_1') {
      items.push({ label: 'Instructions DG', to: '/circuit/instructions-dg', icon: ClipboardList });
      items.push({ label: 'Justesse du tri', to: '/circuit/justesse-tri', icon: Target });
    }

    return [{ title: 'Circuit courrier', items }];
  }

  return [];
}

/**
 * Pages qui n'apparaissent pas dans navigationForUser (fiches de détail,
 * comptes) mais doivent quand même porter un titre lisible dans l'en-tête
 * et être trouvables depuis la palette de commandes.
 */
const PAGES_HORS_NAVIGATION = [
  { label: 'Changer le mot de passe', to: '/changer-mot-de-passe' },
];

/**
 * Fil d'Ariane (section + libellé de la page) et liste aplatie des pages
 * pour la palette de commandes — dérivés de navigationForUser, jamais
 * dupliqués : une page ajoutée à la sidebar apparaît automatiquement aux
 * deux endroits.
 */
export function pagesPourUtilisateur(user) {
  const pages = navigationForUser(user).flatMap((section) =>
    section.items.map((item) => ({ section: section.title, label: item.label, to: item.to, icon: item.icon })),
  );

  return [...pages, ...PAGES_HORS_NAVIGATION.map((p) => ({ section: null, ...p }))];
}

/**
 * Résout la page courante (section + libellé) à partir du chemin exact —
 * suffit ici : les chemins de navigationForUser sont déjà résolus par
 * utilisateur (ex. /circuit/${user.poste}), aucun paramètre à faire
 * correspondre. Les fiches de détail (ex. /courriers/:id) ne sont pas dans
 * cette liste ; l'appelant fournit alors son propre titre.
 */
export function pageCourante(pathname, user) {
  return pagesPourUtilisateur(user).find((p) => p.to === pathname) ?? null;
}

/**
 * Route de la première page d'une section — sert de cible au segment de
 * section du fil d'Ariane (voir AppLayout) : une section n'a pas de route
 * propre, seulement des pages, on retombe donc sur la première.
 */
export function accueilDeSection(titreSection, user) {
  const section = navigationForUser(user).find((s) => s.title === titreSection);
  return section?.items[0]?.to ?? null;
}
