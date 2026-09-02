import { Link } from 'react-router-dom';
import { MapPin, Mail, Phone, Clock, ExternalLink } from 'lucide-react';
import { OntLogo } from '../../../shared/components/ui/OntLogo';
import {
  NOM_PORTAIL,
  SOUS_TITRE_INSTITUTIONNEL,
  ADRESSE_PORTAIL,
  EMAIL_PORTAIL,
  TELEPHONE_PORTAIL,
  HORAIRES_PORTAIL,
  SITE_INSTITUTIONNEL_URL,
} from '../constants';

const LIENS_NAVIGATION = [
  { label: 'Accueil', to: '/' },
  { label: 'À propos', to: '/a-propos' },
  { label: 'Services', to: '/services' },
  { label: 'Suivre mon dossier', to: '/suivi-dossier' },
];

/**
 * Pied de page : un des rares endroits du portail public où un fond ont-blue
 * plus sombre est de mise (charte graphique), le reste du site restant clair.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-ont-blue-900 bg-ont-blue-950">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <OntLogo className="h-9 w-9 shrink-0" />
            <span className="font-heading text-sm font-semibold text-white">{NOM_PORTAIL}</span>
          </div>
          <p className="text-sm text-ont-blue-200">{SOUS_TITRE_INSTITUTIONNEL}</p>
        </div>

        <div>
          <h2 className="mb-3 font-heading text-sm font-semibold text-white">Navigation</h2>
          <ul className="space-y-2 text-sm">
            {LIENS_NAVIGATION.map((lien) => (
              <li key={lien.to}>
                <Link to={lien.to} className="text-ont-blue-200 hover:text-white">
                  {lien.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-heading text-sm font-semibold text-white">Contact</h2>
          <ul className="space-y-2 text-sm text-ont-blue-200">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-ont-gold-400" />
              {ADRESSE_PORTAIL}
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} className="shrink-0 text-ont-gold-400" />
              <a href={`mailto:${EMAIL_PORTAIL}`} className="hover:text-white">
                {EMAIL_PORTAIL}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="shrink-0 text-ont-gold-400" />
              <a href={`tel:${TELEPHONE_PORTAIL.replace(/\s+/g, '')}`} className="hover:text-white">
                {TELEPHONE_PORTAIL}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Clock size={16} className="shrink-0 text-ont-gold-400" />
              {HORAIRES_PORTAIL}
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-heading text-sm font-semibold text-white">Informations touristiques</h2>
          <p className="mb-3 text-sm text-ont-blue-200">
            Ce portail sert la gestion administrative interne de l'ONT. Pour découvrir les destinations et l'offre touristique de la
            RDC, consultez le site institutionnel officiel.
          </p>
          <a
            href={SITE_INSTITUTIONNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ont-gold-400 hover:text-ont-gold-300 hover:underline"
          >
            Site institutionnel de l'ONT
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="border-t border-ont-blue-900 px-4 py-5 text-center text-xs text-ont-blue-300">
        © {new Date().getFullYear()} Office National du Tourisme — République Démocratique du Congo. Tous droits réservés.
      </div>
    </footer>
  );
}
