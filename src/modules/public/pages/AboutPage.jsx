import { Target, Building2, Users, MapPin, Mail, Phone, Clock } from 'lucide-react';
import { InstitutionIllustration } from '../components/illustrations/InstitutionIllustration';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';
import { ADRESSE_PORTAIL, EMAIL_PORTAIL, TELEPHONE_PORTAIL, HORAIRES_PORTAIL } from '../constants';

const PILIERS = [
  {
    icone: Target,
    titre: 'Notre mission',
    texte:
      "Structurer, réguler et promouvoir le secteur touristique de la République Démocratique du Congo, en coordination avec les acteurs publics et privés du tourisme.",
  },
  {
    icone: Building2,
    titre: 'Notre organisation',
    texte:
      "L'Office est structuré en huit directions centrales, chacune responsable d'un volet opérationnel : ressources humaines, finances, communication, formation, audit, investissements, planification et mobilisation du fonds de promotion.",
  },
  {
    icone: Users,
    titre: 'Nos interlocuteurs',
    texte:
      "Étudiants et établissements pour l'accueil de stagiaires, partenaires institutionnels et privés pour la correspondance administrative, et le grand public pour toute demande relevant de nos missions.",
  },
];

const COORDONNEES = [
  { icone: MapPin, texte: ADRESSE_PORTAIL },
  { icone: Mail, texte: EMAIL_PORTAIL, href: `mailto:${EMAIL_PORTAIL}` },
  { icone: Phone, texte: TELEPHONE_PORTAIL, href: `tel:${TELEPHONE_PORTAIL.replace(/\s+/g, '')}` },
  { icone: Clock, texte: HORAIRES_PORTAIL },
];

function Pilier({ pilier }) {
  const { ref, className } = useRevealOnScroll();
  const Icone = pilier.icone;
  return (
    <div ref={ref} className={`flex gap-4 ${className}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-ont-blue-700 text-white">
        <Icone size={22} />
      </div>
      <div>
        <h3 className="mb-1.5 font-heading text-base font-semibold text-text">{pilier.titre}</h3>
        <p className="text-sm leading-relaxed text-text-subtle">{pilier.texte}</p>
      </div>
    </div>
  );
}

export function AboutPage() {
  const hero = useRevealOnScroll();
  const contact = useRevealOnScroll();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div ref={hero.ref} className={`mb-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ${hero.className}`}>
        <div>
          <p className="mb-3 text-sm font-semibold tracking-wide text-ont-gold-600 uppercase">À propos</p>
          <h1 className="mb-5 font-heading text-3xl font-bold text-text sm:text-4xl">
            L'Office National du Tourisme de la RDC
          </h1>
          <p className="text-base leading-relaxed text-text-muted">
            Ce portail est l'outil de gestion administrative interne de l'Office : il centralise le circuit du courrier et le suivi
            des stagiaires accueillis par ses différentes directions. Il ne remplace pas le site institutionnel de l'Office, dédié à
            la promotion touristique de la RDC.
          </p>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <InstitutionIllustration />
        </div>
      </div>

      <div className="mb-16 grid grid-cols-1 gap-10 md:grid-cols-3">
        {PILIERS.map((pilier) => (
          <Pilier key={pilier.titre} pilier={pilier} />
        ))}
      </div>

      <div
        ref={contact.ref}
        className={`rounded-card border border-border bg-surface p-6 shadow-card sm:p-8 ${contact.className}`}
      >
        <h2 className="mb-4 font-heading text-lg font-semibold text-text">Nous contacter</h2>
        <ul className="grid grid-cols-1 gap-3 text-sm text-text-muted sm:grid-cols-2">
          {COORDONNEES.map(({ icone: Icone, texte, href }) => (
            <li key={texte} className="flex items-start gap-2.5">
              <Icone size={18} className="mt-0.5 shrink-0 text-ont-blue-600" />
              {href ? (
                <a href={href} className="hover:text-ont-blue-700 hover:underline">
                  {texte}
                </a>
              ) : (
                texte
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
