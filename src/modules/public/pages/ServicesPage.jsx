import { Link } from 'react-router-dom';
import { GraduationCap, Mail, Search, ArrowRight } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';

// Même code couleur que les cartes de la page d'accueil : bleu pour le
// suivi, or pour le stage, vert pour le courrier — une identité de marque
// cohérente sur tout le portail, pas seulement sur la page d'accueil.
const ACCENTS = {
  bleu: 'bg-ont-blue-700 text-white',
  or: 'bg-ont-gold-400 text-ont-blue-950',
  vert: 'bg-ont-green-600 text-white',
};

const SERVICES = [
  {
    icone: GraduationCap,
    titre: 'Dépôt de demande de stage',
    public: 'Étudiants et candidats à un stage au sein de l’une des directions de l’Office.',
    preparer: 'Vos coordonnées, l’établissement d’origine, la période souhaitée, et la lettre de votre université en format PDF ou image.',
    to: '/demande-de-stage',
    libelleBouton: 'Déposer ma demande',
    accent: 'or',
  },
  {
    icone: Mail,
    titre: 'Dépôt de courrier externe',
    public: 'Partenaires, institutions et prestataires souhaitant transmettre un courrier à l’Office sans se déplacer.',
    preparer: 'Vos coordonnées de contact, l’objet du courrier, et le document à transmettre en format PDF ou image.',
    to: '/depot-courrier-externe',
    libelleBouton: 'Déposer un courrier',
    accent: 'vert',
  },
  {
    icone: Search,
    titre: 'Suivi de dossier',
    public: 'Toute personne ayant déjà déposé une demande de stage ou un courrier sur ce portail.',
    preparer: 'Le numéro d’accusé de réception reçu au moment du dépôt.',
    to: '/suivi-dossier',
    libelleBouton: 'Suivre mon dossier',
    accent: 'bleu',
  },
];

function ServiceRow({ service, index }) {
  const { ref, className } = useRevealOnScroll();
  const Icone = service.icone;
  const inverse = index % 2 === 1;

  return (
    <div
      ref={ref}
      className={`grid grid-cols-1 items-center gap-8 rounded-card border border-border bg-white p-6 shadow-card transition-shadow duration-300 hover:shadow-raised sm:p-8 md:grid-cols-[auto_1fr] ${className}`}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-xl ${ACCENTS[service.accent]} ${inverse ? 'md:order-2' : ''}`}
      >
        <Icone size={26} />
      </div>
      <div className={inverse ? 'md:order-1' : ''}>
        <h2 className="mb-3 font-heading text-xl font-semibold text-text">{service.titre}</h2>
        <dl className="mb-5 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-text-muted">Pour qui —</dt>
            <dd className="text-text-subtle">{service.public}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-medium text-text-muted">À préparer —</dt>
            <dd className="text-text-subtle">{service.preparer}</dd>
          </div>
        </dl>
        <Link to={service.to}>
          <Button type="button" size="sm" className="gap-1.5">
            {service.libelleBouton}
            <ArrowRight size={14} />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function ServicesPage() {
  const intro = useRevealOnScroll();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div ref={intro.ref} className={`mb-12 max-w-2xl ${intro.className}`}>
        <p className="mb-3 text-sm font-semibold tracking-wide text-ont-gold-600 uppercase">Services</p>
        <h1 className="mb-4 font-heading text-3xl font-bold text-text">Nos services numériques</h1>
        <p className="text-text-subtle">
          Trois démarches disponibles directement en ligne, sans compte ni déplacement au siège de l'Office.
        </p>
      </div>

      <div className="space-y-6">
        {SERVICES.map((service, index) => (
          <ServiceRow key={service.to} service={service} index={index} />
        ))}
      </div>
    </div>
  );
}
