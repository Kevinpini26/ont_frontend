import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { reinitialiserMotDePasse } from '../api/authApi';
import { Button } from '../../../shared/components/ui/Button';
import { Field } from '../../../shared/components/ui/Field';
import { PasswordInput } from '../../../shared/components/ui/PasswordInput';
import { Alert } from '../../../shared/components/ui/Alert';
import { OntLogo } from '../../../shared/components/ui/OntLogo';

export function ReinitialiserMotDePassePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';

  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseConfirmation, setMotDePasseConfirmation] = useState('');
  const [erreur, setErreur] = useState(null);
  const [succes, setSucces] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      await reinitialiserMotDePasse(email, token, motDePasse, motDePasseConfirmation);
      setSucces(true);
      setTimeout(() => navigate('/connexion'), 2000);
    } catch (err) {
      setErreur(
        err.response?.data?.message ??
          Object.values(err.response?.data?.errors ?? {})[0]?.[0] ??
          'Ce lien est invalide ou a expiré.',
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 flex flex-col items-center text-center">
          <OntLogo className="mb-3 h-12 w-12" />
          <h1 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-50">Réinitialiser le mot de passe</h1>
        </div>

        {succes ? (
          <Alert tone="success">Mot de passe réinitialisé avec succès. Redirection vers la connexion…</Alert>
        ) : (
          <>
            {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}

            {(!email || !token) ? (
              <Alert tone="error">Ce lien est incomplet. Redemandez une réinitialisation depuis la page de connexion.</Alert>
            ) : (
              <form onSubmit={soumettre} className="space-y-4">
                <Field
                  label="Nouveau mot de passe"
                  htmlFor="mot_de_passe"
                  required
                  hint="12 caractères minimum, majuscules, minuscules et chiffres."
                >
                  <PasswordInput
                    id="mot_de_passe"
                    autoComplete="new-password"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Confirmer le nouveau mot de passe" htmlFor="mot_de_passe_confirmation" required>
                  <PasswordInput
                    id="mot_de_passe_confirmation"
                    autoComplete="new-password"
                    value={motDePasseConfirmation}
                    onChange={(e) => setMotDePasseConfirmation(e.target.value)}
                    required
                  />
                </Field>
                <Button type="submit" disabled={enCours} className="w-full">
                  {enCours ? 'Réinitialisation…' : 'Réinitialiser mon mot de passe'}
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
