import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '../../../shared/components/ui/Button';

/**
 * Écran de confirmation d'un dépôt public (demande de stage, courrier
 * externe) — le numéro d'accusé de réception est la seule chose qu'un
 * candidat externe doit absolument repartir avec : mis en avant en grand,
 * copiable en un clic plutôt qu'à sélectionner à la main.
 */
export function ConfirmationDepot({ numero, description, suivi }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(numero);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé, permission
      // refusée) : le numéro reste affiché et sélectionnable à la main.
    }
  }

  return (
    <div className="bg-surface-sunken py-16 lg:py-22">
      <div className="mx-auto max-w-md px-4 sm:px-6 lg:px-8">
        <div className="rounded-card border border-border bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ont-green-100 text-ont-green-700">
            <Check size={24} />
          </div>
          <h1 className="font-heading text-lg font-semibold text-text">{description}</h1>
          <p className="mt-2 text-sm text-text-muted">Un e-mail de confirmation vous a été envoyé avec votre numéro d'accusé de réception :</p>

          <div className="mt-4 flex items-center justify-center gap-2">
            <p className="rounded-md bg-ont-blue-50 px-4 py-2.5 font-mono text-lg font-bold tracking-wide text-ont-blue-800">
              {numero}
            </p>
            <Button type="button" variant="secondary" size="icon" onClick={copier} aria-label="Copier le numéro d'accusé de réception">
              {copie ? <Check size={18} className="text-ont-green-600" /> : <Copy size={18} />}
            </Button>
          </div>
          {copie && <p className="mt-1.5 text-xs text-ont-green-700">Numéro copié.</p>}

          <p className="mt-4 text-xs text-text-subtle">{suivi}</p>
          <a
            href={`/suivi-dossier?numero=${encodeURIComponent(numero)}`}
            className="mt-5 block text-sm font-medium text-ont-blue-700 hover:underline"
          >
            Suivre l'état de mon dossier →
          </a>
        </div>
      </div>
    </div>
  );
}
