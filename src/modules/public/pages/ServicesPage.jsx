import { Link } from 'react-router-dom';
import { GraduationCap, Mail, Search, ArrowRight } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';

// Même code couleur que les cartes de la page d'accueil : bleu pour le
// suivi, or pour le stage, vert pour le courrier — une identité de marque
// cohérente sur tout le portail, pas seulement sur la page d'accueil.
const ACCENTS = {
  bleu: 'bg-ont-blue-700 text-white group-hover:bg-ont-blue-800',
  or: 'bg-ont-gold-400 text-ont-blue-950 group-hover:bg-ont-gold-500',
  // green-700 (pas 600) : icône blanche sur ont-green-600 ne donne que
  // 3,14 de contraste, marge trop fine sur les 3,0 requis pour un élément
  // graphique — vérifié par calcul.
  vert: 'bg-ont-green-700 text-white group-hover:bg-ont-green-800',
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
  const { ref, className, style } = useRevealOnScroll(index);
  const Icone = service.icone;
  const inverse = index % 2 === 1;

  return (
    <div
      ref={ref}
      style={style}
      className={`group grid grid-cols-1 items-center gap-8 rounded-card border border-border bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-raised sm:p-8 md:grid-cols-[auto_1fr] ${className}`}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${ACCENTS[service.accent]} ${inverse ? 'md:order-2' : ''}`}
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
    <div>
      <section className="bg-white">
        <div ref={intro.ref} style={intro.style} className={`mx-auto max-w-5xl px-4 pt-16 pb-4 sm:px-6 lg:px-8 lg:pt-22 ${intro.className}`}>
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold tracking-wide text-ont-gold-800 uppercase">Services</p>
            <h1 className="mb-4 font-heading text-3xl font-bold text-text sm:text-4xl">Nos services numériques</h1>
            <p className="text-text-subtle">
              Trois démarches disponibles directement en ligne, sans compte ni déplacement au siège de l'Office.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white pt-8 pb-16 lg:pb-22">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {SERVICES.map((service, index) => (
              <ServiceRow key={service.to} service={service} index={index} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
