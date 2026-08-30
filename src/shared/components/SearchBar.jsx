import { useEffect, useState } from 'react';
import { inputClass } from './ui/Field';

/**
 * Barre de recherche générique (par référence ou nom), avec debounce, pour
 * filtrer les listes de courriers ou de stagiaires.
 */
export function SearchBar({ value, onChange, placeholder = 'Rechercher par référence ou nom…' }) {
  const [texte, setTexte] = useState(value ?? '');

  useEffect(() => {
    const identifiant = setTimeout(() => onChange(texte), 300);
    return () => clearTimeout(identifiant);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texte]);

  return (
    <div className="relative w-full max-w-xs">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="search"
        className={`${inputClass} pl-9`}
        placeholder={placeholder}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
      />
    </div>
  );
}
