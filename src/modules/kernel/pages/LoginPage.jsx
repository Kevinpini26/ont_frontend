import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login as loginRequest } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { PasswordInput } from '../../../shared/components/ui/PasswordInput';
import { Alert } from '../../../shared/components/ui/Alert';
import { OntLogo } from '../../../shared/components/ui/OntLogo';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);

    try {
      const { user, token, expires_at: expiresAt } = await loginRequest(email, password);
      setSession(user, token, expiresAt);
      navigate('/');
    } catch (err) {
      setErreur(
        err.response?.data?.message ??
          Object.values(err.response?.data?.errors ?? {})[0]?.[0] ??
          'Connexion impossible.',
      );
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface-sunken px-4">
      <form
        onSubmit={soumettre}
        className="w-full max-w-sm rounded-card border border-border bg-surface p-8"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <OntLogo className="mb-3 h-12 w-12" />
          <h1 className="font-heading text-lg font-semibold text-text">Office National du Tourisme</h1>
          <p className="mt-1 text-sm text-text-subtle">Système d'information — Connexion</p>
        </div>

        {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}

        <div className="space-y-4">
          <Field label="Adresse e-mail" htmlFor="email" required>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Mot de passe" htmlFor="password" required>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          <Button type="submit" disabled={enCours} className="w-full">
            {enCours ? 'Connexion…' : 'Se connecter'}
          </Button>
        </div>

        <p className="mt-5 space-y-1 text-center text-sm text-text-subtle">
          <a href="/mot-de-passe-oublie" className="block font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400">
            Mot de passe oublié ?
          </a>
          <a href="/demande-de-stage" className="block font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400">
            Déposer une demande de stage →
          </a>
          <a href="/suivi-dossier" className="block font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400">
            Suivre un dossier sans compte →
          </a>
          <a href="/" className="block font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400">
            ← Retour au site public
          </a>
        </p>
      </form>
    </div>
  );
}
