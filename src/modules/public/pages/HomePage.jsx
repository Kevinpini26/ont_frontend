import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { GraduationCap, Mail, Search, ArrowRight, ShieldCheck, MapPin, Clock, Phone } from 'lucide-react';
import { useAuthStore } from '../../kernel/store/authStore';
import { ROLES } from '../../kernel/constants';
import { Button } from '../../../shared/components/ui/Button';
import { BandeauAnnonce } from '../components/BandeauAnnonce';
import { DemarcheFrise } from '../components/DemarcheFrise';
import { FaqAccordion } from '../components/FaqAccordion';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';
import { useCompteur } from '../hooks/useCompteur';
import { getDisponibiliteDemandesStage, getStatistiquesPubliques } from '../api/publicApi';
import { sontTousLesTypesFermes } from '../utils/disponibiliteDemandes';
import { ADRESSE_PORTAIL, TELEPHONE_PORTAIL, HORAIRES_PORTAIL } from '../constants';

const DESTINATION_PAR_ROLE = {
  [ROLES.ADMINISTRATEUR]: '/admin/directions',
  [ROLES.AGENT_DFP]: '/stagiaires/dashboard',
  [ROLES.DIRECTEUR_DIRECTION]: '/direction/tableau-de-bord',
  [ROLES.RESPONSABLE_DIRECTION]: '/direction/tableau-de-bord',
  [ROLES.SECRETARIAT_DIRECTION]: '/direction/courrier',
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
    etapes: ['Choisissez le type de stage', 'Joignez vos pièces', 'Recevez votre accusé de réception'],
    delai: 'Réponse sous quelques jours ouvrés',
  },
  {
    icone: Mail,
    titre: 'Dépôt de courrier',
    texte: "Partenaires et institutions : déposez un courrier à l'attention de l'ONT sans vous déplacer.",
    to: '/depot-courrier-externe',
    libelleBouton: 'Déposer un courrier',
    accent: 'vert',
    etapes: ['Décrivez l’objet du courrier', 'Joignez le document', 'Recevez votre accusé de réception'],
    delai: 'Pris en charge par le Protocole sous 48h',
  },
  {
    icone: Search,
    titre: 'Suivi de dossier',
    texte: "Retrouvez l'état d'avancement de votre dossier à tout moment grâce à votre numéro d'accusé de réception.",
    to: '/suivi-dossier',
    libelleBouton: 'Suivre mon dossier',
    accent: 'bleu',
    etapes: ['Munissez-vous de votre numéro', 'Indiquez votre nom', 'Consultez l’état du dossier'],
    delai: 'Disponible à tout moment',
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

function ServiceCard({ service, indisponible, index }) {
  const { ref, className, style } = useRevealOnScroll(index);
  const Icone = service.icone;
  const accent = ACCENTS[service.accent];
  return (
    <div
      ref={ref}
      style={style}
      className={`group overflow-hidden rounded-card border border-border bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-raised ${className}`}
    >
      <div className={`h-[3px] w-full ${accent.liseré}`} aria-hidden="true" />
      <div className="p-6">
        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${accent.icone}`}>
          <Icone size={22} />
        </div>
        <h3 className="mb-2 font-heading text-base font-semibold text-text">{service.titre}</h3>
        <p className="mb-4 text-sm text-text-subtle">
          {indisponible ? 'Les demandes de stage ne sont pas ouvertes actuellement. Revenez plus tard.' : service.texte}
        </p>
        <ol className="mb-4 space-y-1.5">
          {service.etapes.map((etape, i) => (
            <li key={etape} className="flex items-start gap-2 text-xs text-text-subtle">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-sunken font-semibold text-text-muted">
                {i + 1}
              </span>
              {etape}
            </li>
          ))}
        </ol>
        <p className="mb-5 text-xs font-medium text-text-subtle">{service.delai}</p>
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
 * Bande de chiffres, pleine largeur, seule section à hauteur volontairement
 * fixe (voir le prompt de refonte) — fond ont-blue-950 pour casser
 * l'empilement de sections claires. `null` tant que non chargée : aucun
 * chiffre à zéro affiché par erreur avant la réponse de l'API, jamais de
 * tiret pour une métrique manquante (voir stagiaires_accueillis).
 */
function Statistique({ valeur, label, suffixe = '' }) {
  const { ref, valeur: valeurAnimee } = useCompteur(valeur);
  return (
    <div ref={ref} className="text-center">
      <p className="font-heading font-bold text-white text-stat">
        {valeur == null ? '—' : `${valeurAnimee}${suffixe}`}
      </p>
      <p className="mt-1.5 text-sm text-ont-blue-200">{label}</p>
    </div>
  );
}

function BandeStatistiques() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStatistiquesPubliques().then(setStats).catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <div className="bg-ont-blue-950 py-14">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        <Statistique valeur={stats.dossiers_traites} label="Dossiers traités" />
        <Statistique
          valeur={stats.delai_moyen_jours}
          label="Délai moyen de traitement"
          suffixe={stats.delai_moyen_jours != null ? ' j' : ''}
        />
        <Statistique valeur={stats.directions_actives} label="Directions actives" />
        <Statistique valeur={stats.stagiaires_accueillis} label="Stagiaires accueillis cette année" />
      </div>
    </div>
  );
}

function CarteExempleDossier() {
  return (
    <div className="rounded-card border border-border bg-surface-raised p-4 shadow-raised lg:w-64">
      <p className="mb-2 text-2xs font-semibold tracking-wide text-text-subtle uppercase">Exemple</p>
      <p className="font-heading text-sm font-semibold text-text">AR-2026-000842</p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-ont-green-500" aria-hidden="true" />
        <span className="text-xs font-medium text-text-muted">Enregistré</span>
      </div>
      <p className="mt-1 text-xs text-text-subtle">Mis à jour le 12 mars 2026</p>
    </div>
  );
}

export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const [disponibilite, setDisponibilite] = useState(null);

  useEffect(() => {
    getDisponibiliteDemandesStage().then(setDisponibilite);
  }, []);

  const demandesStageFermees = sontTousLesTypesFermes(disponibilite);
  const preparer = useRevealOnScroll();
  const faq = useRevealOnScroll();
  const directions = useRevealOnScroll();
  const contact = useRevealOnScroll();

  if (user) {
    if (user.role === ROLES.AGENT_CIRCUIT_COURRIER) {
      // Un ancien compte Protocole reste identifiable par l'administration,
      // mais n'est plus redirigé vers une file opérationnelle supprimée.
      if (!['protocole', 'assistant_protocole'].includes(user.poste)) return <Navigate to={`/circuit/${user.poste}`} replace />;
    } else {
      return <Navigate to={DESTINATION_PAR_ROLE[user.role] ?? '/connexion'} replace />;
    }
  }

  const urlItineraire = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADRESSE_PORTAIL)}`;

  return (
    <div>
      <BandeauAnnonce disponibilite={disponibilite} />

      {/* Section d'accueil : fond blanc uni (jamais de bloc bleu marine ici,
          réservé à la bande de chiffres et au pied de page pour casser
          l'empilement). Hauteur pilotée par le padding, pas une valeur fixe
          — un titre qui passe sur trois lignes en 360px de large ne doit
          jamais être coupé. Grille asymétrique 7/5, jamais 6/6. */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-28">
          <div className="lg:col-span-7">
            <p className="mb-4 inline-block rounded-full bg-ont-blue-950/5 px-3 py-1 text-xs font-semibold tracking-wide text-ont-gold-800 uppercase">
              République Démocratique du Congo — Office National du Tourisme
            </p>
            <h1 className="mb-5 font-heading font-bold text-text text-hero">
              L'Office National du Tourisme structure et promeut le <span className="text-ont-blue-600">tourisme congolais</span>
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
            <p className="mt-6 flex items-center gap-2 text-sm text-text-subtle">
              <ShieldCheck size={16} className="shrink-0 text-ont-green-600" />
              Service officiel de l'Office — accusé de réception immédiat
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="lg:relative">
              <div className="overflow-hidden rounded-[24px] border border-border shadow-raised">
                <picture>
                  <source srcSet="/kinshasa-fleuve-congo.webp" type="image/webp" />
                  <img
                    src="/kinshasa-fleuve-congo.jpg"
                    alt="Vue de Kinshasa depuis le fleuve Congo"
                    width={1200}
                    height={900}
                    loading="eager"
                    decoding="async"
                    className="aspect-4/3 w-full object-cover lg:aspect-3/4"
                  />
                </picture>
                <div className="pointer-events-none absolute inset-0 bg-ont-blue-700/10" aria-hidden="true" />
              </div>
              {/* Chevauchement en desktop (position absolue) : c'est ce qui
                  crée la profondeur. En mobile, en flux normal sous la photo
                  — jamais en position absolue, elle sortirait du cadre à
                  360px de large. */}
              <div className="relative mt-4 flex justify-center lg:absolute lg:-bottom-6 lg:-left-6 lg:mt-0 lg:block lg:justify-start">
                <CarteExempleDossier />
              </div>
            </div>
            <p className="mt-2 text-right text-xs text-text-subtle">
              Kinshasa, vue depuis le fleuve Congo — Photo : Valdhy Mbemba / Unsplash
            </p>
          </div>
        </div>
      </section>

      <BandeStatistiques />

      {/* Le bloc "je fais ma démarche" se tient d'un seul morceau : services,
          comment ça marche, pièces à préparer, questions fréquentes — tout
          en fond blanc ou surface-sunken, avant le contenu institutionnel. */}
      <section className="bg-white py-16 lg:py-22">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <h2 className="mb-3 font-heading text-2xl font-bold text-text">Nos services numériques</h2>
            <p className="text-text-subtle">
              Trois démarches disponibles en ligne, sans avoir à vous déplacer au siège de l'Office.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {SERVICES.map((service, index) => (
              <ServiceCard
                key={service.to}
                service={service}
                index={index}
                indisponible={service.to === '/demande-de-stage' && demandesStageFermees}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-sunken py-16 lg:py-22">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 max-w-2xl">
            <h2 className="mb-3 font-heading text-2xl font-bold text-text">Comment ça marche</h2>
            {/* text-muted, pas text-subtle : directement sur bg-surface-sunken,
                où text-subtle tombe à 4,34 de contraste — sous les 4,5 requis. */}
            <p className="text-text-muted">De la demande à la décision, votre dossier reste suivi à chaque étape.</p>
          </div>
          <DemarcheFrise />
        </div>
      </section>

      <section ref={preparer.ref} style={preparer.style} className={`bg-white py-16 lg:py-22 ${preparer.className}`}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <h2 className="mb-3 font-heading text-2xl font-bold text-text">Ce que vous devez préparer</h2>
            <p className="text-text-subtle">Un dossier complet dès le premier dépôt évite les allers-retours.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="rounded-card border border-border bg-white p-6">
              <p className="mb-1 text-xs font-semibold tracking-wide text-ont-gold-700 uppercase">Stage académique</p>
              <h3 className="mb-4 font-heading text-lg font-semibold text-text">Une seule pièce requise</h3>
              <ul className="space-y-2 text-sm text-text-muted">
                <li>• Lettre de stage de votre université, introduisant votre demande</li>
              </ul>
              <p className="mt-4 text-xs text-text-subtle">Format accepté : PDF ou image scannée, 5 Mo maximum.</p>
            </div>
            <div className="rounded-card border border-border bg-white p-6">
              <p className="mb-1 text-xs font-semibold tracking-wide text-ont-green-700 uppercase">Stage professionnel</p>
              <h3 className="mb-4 font-heading text-lg font-semibold text-text">Quatre pièces requises</h3>
              <ul className="space-y-2 text-sm text-text-muted">
                <li>• Lettre de demande de stage</li>
                <li>• CV du candidat</li>
                <li>• Diplôme d'État</li>
                <li>• Dernier diplôme obtenu</li>
              </ul>
              <p className="mt-4 text-xs text-text-subtle">Format accepté pour chaque pièce : PDF ou image scannée, 5 Mo maximum.</p>
            </div>
          </div>
        </div>
      </section>

      <section ref={faq.ref} style={faq.style} className={`bg-surface-sunken py-16 lg:py-22 ${faq.className}`}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="mb-3 font-heading text-2xl font-bold text-text">Questions fréquentes</h2>
          </div>
          <div className="rounded-card border border-border bg-white px-6">
            <FaqAccordion />
          </div>
        </div>
      </section>

      {/* Contenu institutionnel : directions et contact, après le bloc démarche. */}
      <section className="bg-white">
        <div ref={directions.ref} style={directions.style} className={`mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-22 ${directions.className}`}>
          <div className="mb-10 max-w-2xl">
            <h2 className="mb-3 font-heading text-2xl font-bold text-text">Les huit directions de l'ONT</h2>
            <p className="text-text-subtle">
              L'Office est organisé en huit directions centrales, chacune responsable d'un volet de sa mission.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DIRECTIONS.map((d) => (
              <div key={d.sigle} className="rounded-field border border-border bg-white p-5 text-center transition-colors hover:bg-ont-blue-50">
                <p className="mb-1.5 font-heading text-3xl font-bold text-ont-blue-700">{d.sigle}</p>
                <p className="text-xs text-text-subtle">{d.nom}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-sunken">
        <div
          ref={contact.ref}
          style={contact.style}
          className={`mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-22 ${contact.className}`}
        >
          <div className="lg:col-span-7">
            <h2 className="mb-3 font-heading text-2xl font-bold text-text">Contact et accès</h2>
            <p className="mb-6 text-text-subtle">Nos équipes vous reçoivent aux horaires et à l'adresse ci-dessous.</p>
            <ul className="space-y-3 text-sm text-text-muted">
              <li className="flex items-start gap-2.5">
                <MapPin size={18} className="mt-0.5 shrink-0 text-ont-blue-700" />
                {ADRESSE_PORTAIL}
              </li>
              <li className="flex items-center gap-2.5">
                <Clock size={18} className="shrink-0 text-ont-blue-700" />
                {HORAIRES_PORTAIL} (dépôt de dossiers)
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={18} className="shrink-0 text-ont-blue-700" />
                <a href={`tel:${TELEPHONE_PORTAIL.replace(/\s+/g, '')}`} className="hover:text-ont-blue-700">
                  {TELEPHONE_PORTAIL}
                </a>
              </li>
            </ul>
          </div>
          <div className="flex items-start lg:col-span-5 lg:justify-end">
            <a href={urlItineraire} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="secondary" className="gap-2">
                <MapPin size={16} />
                Itinéraire
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
