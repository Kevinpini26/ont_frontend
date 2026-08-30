import { useState } from 'react';
import { deposerCourrierExterne } from '../api/publicApi';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { FileUploadPreview } from '../../../shared/components/ui/FileUploadPreview';
import { TipTapEditor } from '../../courrier/components/TipTapEditor';

const FORMULAIRE_VIDE = {
  expediteur_externe_nom: '',
  expediteur_externe_email: '',
  expediteur_externe_telephone: '',
  objet: '',
  contenu: '',
  piece_jointe: null,
};

export function CourrierExternePage() {
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [numeroObtenu, setNumeroObtenu] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  function definir(champ) {
    return (e) => setFormulaire((f) => ({ ...f, [champ]: e.target.value }));
  }

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const { numero_accuse_reception } = await deposerCourrierExterne(formulaire);
      setNumeroObtenu(numero_accuse_reception);
    } catch (err) {
      setErreur(
        err.response?.data?.message ??
          Object.values(err.response?.data?.errors ?? {})[0]?.[0] ??
          'Échec du dépôt du courrier.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (numeroObtenu) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-card border border-border bg-surface p-8 text-center shadow-sm">
          <h1 className="font-heading text-lg font-semibold text-text">Courrier envoyé</h1>
          <p className="mt-2 text-sm text-text-muted">
            Votre courrier a bien été reçu. Un e-mail de confirmation vous a été envoyé avec votre numéro d'accusé de réception :
          </p>
          <p className="mt-3 rounded-md bg-ont-blue-50 px-3 py-2 font-mono text-sm font-semibold text-ont-blue-800">
            {numeroObtenu}
          </p>
          <p className="mt-3 text-xs text-text-subtle">
            Conservez ce numéro, il vous permettra de suivre l'état de traitement de votre courrier.
          </p>
          <a
            href={`/suivi-dossier?numero=${encodeURIComponent(numeroObtenu)}`}
            className="mt-5 block text-sm font-medium text-ont-blue-700 hover:underline"
          >
            Suivre l'état de mon dossier →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-card border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-lg font-semibold text-text">Dépôt de courrier</h1>
          <p className="mt-1 text-sm text-text-subtle">
            Transmettez un courrier à l'Office National du Tourisme en tant que partenaire ou institution externe.
          </p>
        </div>

        {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}

        <form onSubmit={soumettre} className="space-y-4">
          <Field label="Nom / raison sociale" htmlFor="expediteur_externe_nom" required>
            <input
              id="expediteur_externe_nom"
              className={inputClass}
              value={formulaire.expediteur_externe_nom}
              onChange={definir('expediteur_externe_nom')}
              required
            />
          </Field>
          <Field
            label="Adresse e-mail"
            htmlFor="expediteur_externe_email"
            required
            hint="Votre accusé de réception vous sera envoyé à cette adresse."
          >
            <input
              id="expediteur_externe_email"
              type="email"
              className={inputClass}
              value={formulaire.expediteur_externe_email}
              onChange={definir('expediteur_externe_email')}
              required
            />
          </Field>
          <Field label="Téléphone (facultatif)" htmlFor="expediteur_externe_telephone">
            <input
              id="expediteur_externe_telephone"
              className={inputClass}
              value={formulaire.expediteur_externe_telephone}
              onChange={definir('expediteur_externe_telephone')}
            />
          </Field>
          <Field label="Objet du courrier" htmlFor="objet" required>
            <input id="objet" className={inputClass} value={formulaire.objet} onChange={definir('objet')} required />
          </Field>
          <Field label="Contenu du courrier (facultatif)" htmlFor="contenu">
            <TipTapEditor content={formulaire.contenu} onChange={(contenu) => setFormulaire((f) => ({ ...f, contenu }))} />
          </Field>
          <Field
            label="Pièce jointe"
            htmlFor="piece_jointe"
            required
            hint="Le document à transmettre (PDF ou image scannée, 5 Mo max)."
          >
            <FileUploadPreview
              id="piece_jointe"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              value={formulaire.piece_jointe}
              onChange={(piece_jointe) => setFormulaire((f) => ({ ...f, piece_jointe }))}
              required
            />
          </Field>

          <Button type="submit" disabled={envoi} className="w-full">
            {envoi ? 'Envoi…' : 'Envoyer mon courrier'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-subtle">
          <a href="/suivi-dossier" className="font-medium text-ont-blue-700 hover:underline">
            Suivre un courrier déjà déposé →
          </a>
        </p>
      </div>
    </div>
  );
}
