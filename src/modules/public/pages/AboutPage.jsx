import { Target, Building2, Users, MapPin, Mail, Phone, Clock } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';
import { ADRESSE_PORTAIL, EMAIL_PORTAIL, TELEPHONE_PORTAIL, HORAIRES_PORTAIL } from '../constants';

// Même palette d'accent que les cartes de services de la page d'accueil
// (bleu, or, vert) — trois piliers, trois couleurs, aucune réutilisée deux
// fois : cohérence de marque sans que « à propos » ne ressemble à un
// doublon de la page d'accueil.
const PILIERS = [
  {
    icone: Target,
    accent: { liseré: 'bg-ont-blue-600', icone: 'bg-ont-blue-700 text-white group-hover:bg-ont-blue-800' },
    titre: 'Notre mission',
    texte:
      "Structurer, réguler et promouvoir le secteur touristique de la République Démocratique du Congo, en coordination avec les acteurs publics et privés du tourisme.",
  },
  {
    icone: Building2,
    accent: { liseré: 'bg-ont-gold-400', icone: 'bg-ont-gold-400 text-ont-blue-950 group-hover:bg-ont-gold-500' },
    titre: 'Notre organisation',
    texte:
      "L'Office est structuré en huit directions centrales, chacune responsable d'un volet opérationnel : ressources humaines, finances, communication, formation, audit, investissements, planification et mobilisation du fonds de promotion.",
  },
  {
    icone: Users,
    accent: { liseré: 'bg-ont-green-600', icone: 'bg-ont-green-700 text-white group-hover:bg-ont-green-800' },
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

function Pilier({ pilier, index }) {
  const { ref, className, style } = useRevealOnScroll(index);
  const Icone = pilier.icone;
  return (
    <div
      ref={ref}
      style={style}
      className={`group overflow-hidden rounded-card border border-border bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-raised ${className}`}
    >
      <div className={`h-[3px] w-full ${pilier.accent.liseré}`} aria-hidden="true" />
      <div className="p-6">
        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${pilier.accent.icone}`}>
          <Icone size={22} />
        </div>
        <h3 className="mb-2 font-heading text-base font-semibold text-text">{pilier.titre}</h3>
        <p className="text-sm leading-relaxed text-text-subtle">{pilier.texte}</p>
      </div>
    </div>
  );
}

export function AboutPage() {
  const piliers = useRevealOnScroll();
  const contact = useRevealOnScroll();
  const urlItineraire = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADRESSE_PORTAIL)}`;

  return (
    <div>
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-22">
          <p className="mb-3 text-sm font-semibold tracking-wide text-ont-gold-600 uppercase">À propos</p>
          <h1 className="mb-5 font-heading text-3xl font-bold text-text sm:text-4xl">
            L'Office National du Tourisme de la RDC
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-text-muted">
            Ce portail est l'outil de gestion administrative interne de l'Office : il centralise le circuit du courrier et le suivi
            des stagiaires accueillis par ses différentes directions. Il ne remplace pas le site institutionnel de l'Office, dédié à
            la promotion touristique de la RDC.
          </p>
        </div>
      </section>

      <section className="bg-surface-sunken py-16 lg:py-22">
        <div ref={piliers.ref} style={piliers.style} className={`mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 ${piliers.className}`}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PILIERS.map((pilier, index) => (
              <Pilier key={pilier.titre} pilier={pilier} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div
          ref={contact.ref}
          style={contact.style}
          className={`mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-22 ${contact.className}`}
        >
          <div className="lg:col-span-7">
            <h2 className="mb-3 font-heading text-2xl font-bold text-text">Nous contacter</h2>
            <p className="mb-6 text-text-subtle">Nos équipes vous reçoivent aux horaires et à l'adresse ci-dessous.</p>
            <ul className="space-y-3 text-sm text-text-muted">
              {COORDONNEES.map(({ icone: Icone, texte, href }) => (
                <li key={texte} className="flex items-start gap-2.5">
                  <Icone size={18} className="mt-0.5 shrink-0 text-ont-blue-700" />
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
