/**
 * `alt=""` par défaut : dans tous les usages de ce composant, un texte ou
 * un titre visible juste à côté nomme déjà l'Office (navbar, pied de page,
 * écrans de connexion...) — un alt répétant ce texte est redondant pour un
 * lecteur d'écran (audit Lighthouse `image-redundant-alt`).
 */
export function OntLogo({ className = 'h-9 w-9', alt = '' }) {
  return (
    <img
      src="/ONT.png"
      alt={alt}
      width={225}
      height={225}
      className={`${className} object-contain`}
    />
  );
}
