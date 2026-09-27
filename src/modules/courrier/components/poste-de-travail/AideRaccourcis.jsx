import { Modal } from '../../../../shared/components/ui/Modal';

const RACCOURCIS_COMMUNS = [
  { touche: 'j / k ou ↓ / ↑', description: 'Se déplacer dans la file' },
  { touche: 'Entrée', description: 'Ouvrir le dossier sélectionné' },
  { touche: 'Échap', description: 'Fermer le panneau latéral' },
  { touche: '1 – 5', description: "Déclencher l'action correspondante de la barre d'actions" },
  { touche: 'a', description: 'Confirmer la réception' },
  { touche: 'Espace', description: 'Sélectionner pour un traitement par lot' },
  { touche: 's', description: 'Passer au dossier suivant après traitement' },
  { touche: '?', description: 'Afficher cette aide' },
];

/** Correction #2 : ces raccourcis ne se déclenchent jamais le focus dans un champ — voir useRaccourcisClavier. */
export function AideRaccourcis({ open, onClose, raccourcisSpecifiques = [] }) {
  // Une touche décrite par l'écran appelant (ex. "u" détourné pour ce seul
  // écran) l'emporte sur sa description générique — jamais les deux à la
  // fois, qui produirait une entrée dupliquée.
  const touchesSpecifiques = new Set(raccourcisSpecifiques.map((r) => r.touche));
  const communs = RACCOURCIS_COMMUNS.filter((r) => !touchesSpecifiques.has(r.touche));

  return (
    <Modal open={open} onClose={onClose} title="Raccourcis clavier" size="sm">
      <dl className="space-y-2.5 text-sm">
        {[...raccourcisSpecifiques, ...communs].map((r) => (
          <div key={r.touche} className="flex items-center justify-between gap-4">
            <dd className="text-text-muted">{r.description}</dd>
            <dt>
              <kbd className="rounded-field bg-surface-sunken px-2 py-1 font-mono text-xs font-semibold text-text ring-1 ring-inset ring-border-strong">
                {r.touche}
              </kbd>
            </dt>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
