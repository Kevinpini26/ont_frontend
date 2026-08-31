import { Link } from 'react-router-dom';

/**
 * Bandeau utile, pas décoratif : évite à un candidat de remplir un
 * formulaire de demande de stage pour rien. Consomme la disponibilité
 * réelle (`getDisponibiliteDemandesStage`, voir HomePage.jsx) — deux
 * traitements distincts, jamais un fond gris neutre pour l'état "fermé" :
 * un bandeau gris en haut de page se lit comme une interface désactivée,
 * alors qu'il porte ici une information à part entière.
 *
 * Aucune période (dates d'ouverture/fermeture) n'est disponible côté
 * backend à ce jour (`disponibilite_demandes_stage` n'expose que deux
 * booléens, académique/professionnel) : le message reste donc au présent,
 * sans dates inventées.
 */
export function BandeauAnnonce({ disponibilite }) {
  if (!disponibilite) return null;

  const { academique, professionnel } = disponibilite;

  if (!academique && !professionnel) {
    return (
      <div className="bg-ont-blue-950 px-4 py-2.5 text-center text-sm text-ont-blue-100">
        Les demandes de stage ne sont pas ouvertes actuellement. Revenez plus tard, ou{' '}
        <Link to="/suivi-dossier" className="font-medium text-white underline underline-offset-2 hover:text-ont-gold-300">
          suivez un dossier déjà déposé
        </Link>
        .
      </div>
    );
  }

  const message =
    academique && professionnel
      ? 'Les demandes de stage académique et professionnel sont actuellement ouvertes.'
      : academique
        ? 'Les demandes de stage académique sont actuellement ouvertes (stage professionnel fermé pour le moment).'
        : 'Les demandes de stage professionnel sont actuellement ouvertes (stage académique fermé pour le moment).';

  return (
    <div className="bg-ont-gold-100 px-4 py-2.5 text-center text-sm text-ont-gold-800">
      {message}{' '}
      <Link to="/demande-de-stage" className="font-semibold underline underline-offset-2 hover:text-ont-gold-800">
        Déposer ma demande
      </Link>
    </div>
  );
}
