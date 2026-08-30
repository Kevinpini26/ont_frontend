import { BarChart3, Building2, CalendarCheck, FileClock, History, Inbox, LayoutDashboard, Mail, ScrollText, Settings, Users } from 'lucide-react';
import { ROLES } from '../modules/kernel/constants';

/**
 * Sections de la sidebar par rôle : chaque agent ne voit que les entrées
 * pertinentes pour son périmètre (poste du circuit courrier, direction,
 * DFP, administration). Point unique de vérité pour la navigation, gardé
 * volontairement séparé du routing (App.jsx) pour rester lisible.
 */
export function navigationForUser(user) {
  if (!user) return [];

  if (user.role === ROLES.ADMINISTRATEUR) {
    return [
      {
        title: 'Administration',
        items: [
          { label: 'Directions', to: '/admin/directions', icon: Building2 },
          { label: 'Utilisateurs', to: '/admin/utilisateurs', icon: Users },
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
          { label: 'Présences', to: '/stagiaires/presences', icon: CalendarCheck },
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

  if (user.role === ROLES.RESPONSABLE_DIRECTION) {
    return [
      {
        title: 'Ma direction',
        items: [
          { label: 'Tableau de bord', to: '/direction/tableau-de-bord', icon: LayoutDashboard },
          { label: 'Courrier', to: '/direction/courrier', icon: Mail, countKey: 'courriers_recus' },
          { label: 'Stagiaires', to: '/direction/stagiaires', icon: Users },
        ],
      },
    ];
  }

  if (user.role === ROLES.AGENT_CIRCUIT_COURRIER) {
    const items = [
      { label: 'Ma file de traitement', to: `/circuit/${user.poste}`, icon: Inbox },
      { label: 'Tableau de bord', to: '/circuit/tableau-de-bord', icon: LayoutDashboard },
    ];

    // La DG dispose en plus d'un espace consolidé transverse, distinct de
    // sa simple file de traitement.
    if (user.poste === 'dg') {
      items.push({ label: 'Espace Direction Générale', to: '/circuit/espace-dg', icon: Building2 });
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
