import { FileInput, Inbox, Search, CheckCircle2 } from 'lucide-react';

const ETAPES = [
  { icone: FileInput, titre: 'Dépôt', texte: 'Vous déposez votre demande en ligne, avec les pièces requises.' },
  { icone: Inbox, titre: 'Accusé de réception', texte: 'Un numéro de suivi vous est remis immédiatement.' },
  { icone: Search, titre: 'Examen', texte: 'Le dossier est instruit par la direction concernée.' },
  { icone: CheckCircle2, titre: 'Décision', texte: 'Vous êtes informé du résultat, consultable à tout moment.' },
];

/**
 * Frise horizontale — la section qui rassure : montre que le dossier ne
 * disparaît pas dans un tiroir une fois déposé. Passe en vertical en
 * mobile (voir la classe `sm:` sur le conteneur et le connecteur).
 */
export function DemarcheFrise() {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-4 sm:gap-4">
      {ETAPES.map((etape, index) => {
        const Icone = etape.icone;
        return (
          <div key={etape.titre} className="relative flex sm:flex-col sm:items-center sm:text-center">
            {/* Connecteur : trait horizontal en desktop (relie les pastilles), vertical en mobile. */}
            {index > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-6 right-full hidden h-px w-8 bg-ont-blue-200 sm:block"
              />
            )}
            {index < ETAPES.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-12 bottom-[-2rem] left-6 w-px bg-ont-blue-200 sm:hidden"
              />
            )}
            <div className="mr-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ont-blue-700 text-white sm:mr-0 sm:mb-4">
              <Icone size={22} />
            </div>
            <div>
              <p className="mb-1 font-heading text-sm font-semibold text-text">
                <span className="mr-1.5 text-ont-blue-400">{index + 1}.</span>
                {etape.titre}
              </p>
              <p className="text-sm text-text-subtle">{etape.texte}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
