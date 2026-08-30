import { useEffect, useState } from 'react';
import { FileText, Image as ImageIcon, Paperclip, UploadCloud, X } from 'lucide-react';

function formatTaille(octets) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function IconePourFichier({ type }) {
  if (type === 'application/pdf') return <FileText size={20} />;
  if (type.startsWith('image/')) return <ImageIcon size={20} />;
  return <Paperclip size={20} />;
}

/**
 * Sélecteur de fichier avec aperçu (vignette pour une image, icône +
 * nom + poids sinon) et possibilité de retirer le fichier choisi avant
 * l'envoi. Zone de glisser-déposer en plus du clic classique — un
 * candidat externe qui dépose une pièce jointe depuis son bureau n'a pas
 * à chercher un bouton "parcourir" caché derrière l'input natif. Le texte
 * d'aide passe par le `hint` du <Field> englobant, pas par ce composant,
 * pour ne jamais l'afficher en double.
 */
export function FileUploadPreview({ id, value, onChange, accept, required }) {
  const [survole, setSurvole] = useState(false);
  const [apercuUrl, setApercuUrl] = useState(null);

  useEffect(() => {
    if (!value || !value.type.startsWith('image/')) {
      setApercuUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setApercuUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  function accepteLeFichier(fichier) {
    if (!fichier || !accept) return true;
    const types = accept.split(',').map((t) => t.trim().toLowerCase());
    const nom = fichier.name.toLowerCase();
    return types.some((t) => (t.startsWith('.') ? nom.endsWith(t) : fichier.type === t));
  }

  function surDepot(e) {
    e.preventDefault();
    setSurvole(false);
    const fichier = e.dataTransfer.files?.[0] ?? null;
    if (fichier && accepteLeFichier(fichier)) onChange(fichier);
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-field border border-border-strong bg-surface-sunken px-3 py-2.5">
        {apercuUrl ? (
          <img src={apercuUrl} alt="" className="h-9 w-9 shrink-0 rounded-field object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-field bg-ont-blue-100 text-ont-blue-700 dark:bg-ont-blue-900/40 dark:text-ont-blue-300">
            <IconePourFichier type={value.type} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text">{value.name}</p>
          <p className="text-xs text-text-subtle">{formatTaille(value.size)}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-field text-text-subtle hover:bg-border-strong hover:text-text-muted"
          aria-label="Retirer le fichier"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      onDragOver={(e) => {
        e.preventDefault();
        setSurvole(true);
      }}
      onDragLeave={() => setSurvole(false)}
      onDrop={surDepot}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-field border-2 border-dashed px-3 py-5 text-center transition-colors ${
        survole ? 'border-ont-blue-500 bg-ont-blue-50 dark:bg-ont-blue-950/40' : 'border-border-strong hover:border-border-strong/70 hover:bg-surface-sunken'
      }`}
    >
      <UploadCloud size={22} className="text-text-subtle" aria-hidden="true" />
      <p className="text-sm text-text-muted">
        <span className="font-medium text-ont-blue-700 dark:text-ont-blue-400">Choisissez un fichier</span> ou glissez-le ici
      </p>
      <input
        id={id}
        type="file"
        accept={accept}
        required={required}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
    </label>
  );
}
