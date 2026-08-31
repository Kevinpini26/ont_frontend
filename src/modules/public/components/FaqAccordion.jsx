import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

const QUESTIONS = [
  {
    question: 'Comment savoir si les demandes de stage sont ouvertes ?',
    reponse:
      "La disponibilité est indiquée en haut de cette page et sur le formulaire de dépôt : un stage académique et un stage professionnel peuvent être ouverts ou fermés indépendamment l'un de l'autre.",
  },
  {
    question: 'Quels documents dois-je fournir pour un stage académique ?',
    reponse:
      "Une lettre de stage de votre université, introduisant votre demande (PDF ou image scannée, 5 Mo maximum). C'est la seule pièce exigée à ce stade.",
  },
  {
    question: 'Quels documents dois-je fournir pour un stage professionnel ?',
    reponse:
      "Une lettre de demande de stage, votre CV, votre diplôme d'État et votre dernier diplôme obtenu — chaque pièce en PDF ou image scannée, 5 Mo maximum.",
  },
  {
    question: 'Comment suivre l’état de mon dossier ?',
    reponse:
      "Avec le numéro d'accusé de réception qui vous a été remis au dépôt, et le nom utilisé lors de la demande, depuis la page « Suivre mon dossier ».",
  },
  {
    question: "J'ai perdu mon numéro d'accusé de réception, que faire ?",
    reponse: 'Contactez l’Office aux coordonnées indiquées en pied de page, en précisant votre nom et la date approximative du dépôt.',
  },
  {
    question: 'Quel est le délai de traitement ?',
    reponse:
      "Il varie selon la nature du dossier et la charge de la direction concernée — le délai moyen constaté est affiché plus haut sur cette page, à titre indicatif.",
  },
  {
    question: 'Puis-je transmettre un courrier sans déposer de demande de stage ?',
    reponse:
      "Oui : les partenaires et institutions peuvent déposer un courrier à l'attention de l'Office directement en ligne, sans dossier de stage associé.",
  },
];

function QuestionItem({ item, ouvert, onToggle }) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouvert}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="font-heading text-sm font-medium text-text">{item.question}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-text-subtle transition-transform duration-200 ${ouvert ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: ouvert ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <p className="pb-4 pr-8 text-sm text-text-subtle">{item.reponse}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Une seule question ouverte à la fois — la hauteur anime via
 * `grid-template-rows` (0fr/1fr), pas `max-height` : pas de valeur de
 * hauteur maximale arbitraire à deviner pour une réponse plus longue que
 * les autres.
 */
export function FaqAccordion() {
  const [ouvert, setOuvert] = useState(null);

  return (
    <div>
      {QUESTIONS.map((item, index) => (
        <QuestionItem
          key={item.question}
          item={item}
          ouvert={ouvert === index}
          onToggle={() => setOuvert((o) => (o === index ? null : index))}
        />
      ))}
      <p className="pt-6 text-center text-sm text-text-subtle">
        D'autres questions ?{' '}
        <Link to="/a-propos" className="font-medium text-ont-blue-700 hover:underline">
          Consultez la page À propos
        </Link>
        .
      </p>
    </div>
  );
}
