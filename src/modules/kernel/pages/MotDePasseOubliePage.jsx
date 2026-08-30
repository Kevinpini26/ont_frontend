import { useState } from 'react';
import { demanderReinitialisationMotDePasse } from '../api/authApi';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { OntLogo } from '../../../shared/components/ui/OntLogo';

export function MotDePasseOubliePage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setEnCours(true);
    try {
      const { message: reponse } = await demanderReinitialisationMotDePasse(email);
      setMessage(reponse);
    } catch {
      // Message générique volontairement identique en cas d'erreur
      // inattendue : jamais confirmer ou infirmer qu'une adresse existe.
      setMessage("Si cette adresse correspond à un compte, un e-mail de réinitialisation vient d'être envoyé.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface-sunken px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <OntLogo className="mb-3 h-12 w-12" />
          <h1 className="font-heading text-lg font-semibold text-text">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-text-subtle">
            Indiquez votre adresse e-mail : un lien de réinitialisation vous sera envoyé s'il correspond à un compte.
          </p>
        </div>

        {message ? (
          <Alert tone="success">{message}</Alert>
        ) : (
          <form onSubmit={soumettre} className="space-y-4">
            <Field label="Adresse e-mail" htmlFor="email" required>
              <input
                id="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" disabled={enCours} className="w-full">
              {enCours ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-subtle">
          <a href="/connexion" className="font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400">
            ← Retour à la connexion
          </a>
        </p>
      </div>
    </div>
  );
}
