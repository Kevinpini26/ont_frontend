import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { GraduationCap, Mail, Search, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../kernel/store/authStore';
import { ROLES } from '../../kernel/constants';
import { Button } from '../../../shared/components/ui/Button';
import { ExchangeIllustration } from '../components/illustrations/ExchangeIllustration';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';
import { getDisponibiliteDemandesStage, getStatistiquesPubliques } from '../api/publicApi';
import { sontTousLesTypesFermes } from '../utils/disponibiliteDemandes';

const DESTINATION_PAR_ROLE = {
  [ROLES.ADMINISTRATEUR]: '/admin/directions',
  [ROLES.AGENT_DFP]: '/stagiaires/dashboard',
  [ROLES.RESPONSABLE_DIRECTION]: '/direction/tableau-de-bord',
};

// Une couleur de marque par service (bleu = suivi, or = stage, vert =
// courrier) — un accent fin (liseré supérieur + pastille d'icône), jamais
// le fond entier de la carte, qui reste blanc pour les trois.
const ACCENTS = {
  bleu: { liseré: 'bg-ont-blue-600', icone: 'bg-ont-blue-700 text-white group-hover:bg-ont-blue-800' },
  or: { liseré: 'bg-ont-gold-400', icone: 'bg-ont-gold-400 text-ont-blue-950 group-hover:bg-ont-gold-500' },
  // icone en green-700 (pas 600) : icône blanche sur ont-green-600 ne
  // donne que 3,14 de contraste, une marge trop fine sur les 3,0 requis
  // pour un élément graphique — vérifié par calcul.
  vert: { liseré: 'bg-ont-green-600', icone: 'bg-ont-green-700 text-white group-hover:bg-ont-green-800' },
};

const SERVICES = [
  {
    icone: GraduationCap,
    titre: 'Dépôt de stage',
    texte: "Déposez votre demande de stage en ligne, avec votre lettre de l'université, et suivez son avancement.",
    to: '/demande-de-stage',
    libelleBouton: 'Déposer ma demande',
    accent: 'or',
  },
  {
    icone: Mail,
    titre: 'Dépôt de courrier',
    texte: "Partenaires et institutions : déposez un courrier à l'attention de l'ONT sans vous déplacer.",
    to: '/depot-courrier-externe',
    libelleBouton: 'Déposer un courrier',
    accent: 'vert',
  },
  {
    icone: Search,
    titre: 'Suivi de dossier',
    texte: "Retrouvez l'état d'avancement de votre dossier à tout moment grâce à votre numéro d'accusé de réception.",
    to: '/suivi-dossier',
    libelleBouton: 'Suivre mon dossier',
    accent: 'bleu',
  },
];

// Sigle + libellé officiel (voir DirectionSeeder.php côté backend) — pas de
// phrase de mission inventée, l'organigramme se lit d'un coup d'œil.
const DIRECTIONS = [
  { sigle: 'DRHL', nom: 'Direction des Ressources Humaines et de la Logistique' },
  { sigle: 'DMFPT', nom: 'Direction de la Mobilisation du Fonds de Promotion du Tourisme' },
  { sigle: 'DF', nom: 'Direction Financière' },
  { sigle: 'DMC', nom: 'Direction Marketing et Communication' },
  { sigle: 'DEP', nom: 'Direction des Études, de la Planification et du Développement Touristique' },
  { sigle: 'DIPP', nom: 'Direction des Investissements, Partenariats et Patrimoine touristique' },
  { sigle: 'DFP', nom: 'Direction de la Formation et de la Professionnalisation' },
  { sigle: 'DAI', nom: "Direction de l'Audit Interne" },
];

function ServiceCard({ service, indisponible }) {
  const { ref, className } = useRevealOnScroll();
  const Icone = service.icone;
  const accent = ACCENTS[service.accent];
  return (
    <div
      ref={ref}
      className={`group overflow-hidden rounded-card border border-border bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-raised ${className}`}
    >
      <div className={`h-1 w-full ${accent.liseré}`} aria-hidden="true" />
      <div className="p-6">
        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${accent.icone}`}>
          <Icone size={22} />
        </div>
        <h3 className="mb-2 font-heading text-base font-semibold text-text">{service.titre}</h3>
        <p className="mb-5 text-sm text-text-subtle">
          {indisponible ? 'Les demandes de stage ne sont pas ouvertes actuellement. Revenez plus tard.' : service.texte}
        </p>
        {indisponible ? (
          <Button type="button" variant="secondary" size="sm" disabled className="gap-1.5">
            {service.libelleBouton}
            <ArrowRight size={14} />
          </Button>
        ) : (
          <Link to={service.to}>
            <Button type="button" variant="secondary" size="sm" className="gap-1.5">
              {service.libelleBouton}
              <ArrowRight size={14} />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Bande de chiffres sous la bannière — trois agrégats publics (voir
 * StatistiquesPubliquesController côté backend), sans donnée nominative.
 * `null` tant que non chargée : aucun chiffre à zéro affiché par erreur
 * avant la réponse de l'API.
 */
function BandeStatistiques() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStatistiquesPubliques().then(setStats).catch(() => {});
  }, []);

  if (!stats) return null;

  const items = [
    { valeur: stats.dossiers_traites, label: 'Dossiers traités' },
    { valeur: stats.delai_moyen_jours != null ? `${stats.delai_moyen_jours} j` : '—', label: 'Délai moyen de traitement' },
    { valeur: stats.directions_actives, label: 'Directions actives' },
  ];

  return (
    <div className="border-y border-ont-blue-100 bg-ont-blue-50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-3 sm:px-6 lg:px-8">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <p className="font-heading text-3xl font-bold text-ont-blue-800">{item.valeur}</p>
            <p className="mt-1 text-sm text-ont-blue-700">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const services = useRevealOnScroll();
  const directions = useRevealOnScroll();
  const [disponibilite, setDisponibilite] = useState(null);

  useEffect(() => {
    getDisponibiliteDemandesStage().then(setDisponibilite);
  }, []);

  const demandesStageFermees = sontTousLesTypesFermes(disponibilite);

  if (user) {
    if (user.role === ROLES.AGENT_CIRCUIT_COURRIER) {
      return <Navigate to={`/circuit/${user.poste}`} replace />;
    }
    return <Navigate to={DESTINATION_PAR_ROLE[user.role] ?? '/connexion'} replace />;
  }

  return (
    <div>
      {/* Bannière : visible sans défiler (hauteur de viewport moins la navbar déjà réservée par PublicLayout).
          Fond clair avec un dégradé très subtil ont-blue vers blanc — jamais de bloc bleu marine plein. */}
      <section className="relative flex min-h-[calc(100svh-5rem)] items-center overflow-hidden bg-gradient-to-b from-ont-blue-50 via-white to-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-ont-gold-100 opacity-60 blur-3xl" />

        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-ont-gold-600 uppercase">
              République Démocratique du Congo
            </p>
            <h1 className="mb-5 font-heading text-3xl font-bold text-text sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
              L'Office National du Tourisme structure et promeut le tourisme congolais
            </h1>
            <p className="mb-8 max-w-lg text-lg text-text-muted">
              Ce portail est votre point de contact administratif avec l'Office : déposez une demande de stage, transmettez un
              courrier, ou suivez l'état d'un dossier déjà déposé.
            </p>
            <div className="flex flex-wrap gap-3">
              {demandesStageFermees ? (
                <Button type="button" size="md" disabled className="gap-1.5">
                  Déposer une demande de stage
                  <ArrowRight size={16} />
                </Button>
              ) : (
                <Link to="/demande-de-stage">
                  <Button type="button" size="md" className="gap-1.5">
                    Déposer une demande de stage
                    <ArrowRight size={16} />
                  </Button>
                </Link>
              )}
              <Link to="/depot-courrier-externe">
                <Button type="button" variant="outline" size="md">
                  Déposer un courrier
                </Button>
              </Link>
            </div>
          </div>

          <div className="hidden justify-center lg:flex">
            <div className="w-full max-w-md">
              <div className="relative overflow-hidden rounded-modal border border-border shadow-raised">
                {/* Masquée sur mobile (hidden lg:flex sur le conteneur
                    parent) : loading="lazy" évite qu'un navigateur mobile
                    télécharge quand même une image jamais affichée. Largeur
                    et hauteur explicites pour réserver l'espace avant
                    chargement et ne pas décaler la mise en page. */}
                <picture>
                  <source srcSet="/kinshasa-fleuve-congo.webp" type="image/webp" />
                  <img
                    src="/kinshasa-fleuve-congo.jpg"
                    alt="Vue de Kinshasa depuis le fleuve Congo"
                    width={1200}
                    height={900}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </picture>
                {/* Masque bleu très léger, pour accorder la photo à la charte plutôt que de la laisser en couleurs brutes. */}
                <div className="pointer-events-none absolute inset-0 bg-ont-blue-700/10" aria-hidden="true" />
              </div>
              <p className="mt-2 text-right text-xs text-text-subtle">Kinshasa, vue depuis le fleuve Congo — Photo : Valdhy Mbemba / Unsplash</p>
            </div>
          </div>
        </div>
      </section>

      <BandeStatistiques />

      {/* Services numériques */}
      <section ref={services.ref} className={`mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 ${services.className}`}>
        <div className="mb-10 max-w-2xl">
          <h2 className="mb-3 font-heading text-2xl font-bold text-text">Nos services numériques</h2>
          <p className="text-text-subtle">
            Trois démarches disponibles en ligne, sans avoir à vous déplacer au siège de l'Office.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {SERVICES.map((service) => (
            <ServiceCard
              key={service.to}
              service={service}
              indisponible={service.to === '/demande-de-stage' && demandesStageFermees}
            />
          ))}
        </div>
      </section>

      {/* Les huit directions — informatif uniquement */}
      <section className="bg-surface-sunken">
        <div ref={directions.ref} className={`mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 ${directions.className}`}>
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="mb-3 font-heading text-2xl font-bold text-text">Les huit directions de l'ONT</h2>
              <p className="text-text-subtle">
                L'Office est organisé en huit directions centrales, chacune responsable d'un volet de sa mission.
              </p>
            </div>
            <div className="hidden w-40 shrink-0 lg:block">
              <ExchangeIllustration />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIRECTIONS.map((d) => (
              <div key={d.sigle} className="rounded-field border border-border bg-white p-5 text-center">
                <p className="mb-1.5 font-heading text-3xl font-bold text-ont-blue-700">{d.sigle}</p>
                <p className="text-xs text-text-subtle">{d.nom}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
