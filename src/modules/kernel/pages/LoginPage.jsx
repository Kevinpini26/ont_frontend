import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Landmark, LockKeyhole } from 'lucide-react';
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
    <div className="grid min-h-svh bg-surface lg:grid-cols-[1.08fr_0.92fr]">
      <section className="institution-banner hidden min-h-svh flex-col justify-between rounded-none p-10 lg:flex xl:p-14" aria-label="Office National du Tourisme">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-card bg-white p-1.5 shadow-card"><OntLogo className="h-11 w-11" /></span>
          <div>
            <p className="font-heading text-base font-semibold uppercase tracking-[0.08em] text-white">Office National du Tourisme</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-ont-gold-300">République démocratique du Congo</p>
          </div>
        </div>
        <div className="max-w-xl pb-8">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">
            <Landmark size={14} /> Plateforme institutionnelle
          </p>
          <h2 className="font-heading text-4xl font-semibold leading-tight text-white xl:text-5xl">La mémoire documentaire au service de l’institution.</h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-blue-100">Un espace sécurisé pour réceptionner, orienter, traiter et archiver les documents de l’ONT.</p>
        </div>
        <p className="text-xs text-blue-200">Système interne de gestion documentaire · Accès réservé</p>
      </section>

      <main className="flex min-h-svh items-center justify-center bg-surface-sunken px-5 py-10 sm:px-10">
      <form onSubmit={soumettre} className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-card sm:p-9">
        <div className="mb-7">
          <div className="mb-5 flex items-center gap-3 lg:hidden"><OntLogo className="h-11 w-11" /><span className="font-heading text-sm font-semibold uppercase text-text">Office National du Tourisme</span></div>
          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-field bg-ont-blue-50 text-ont-blue-700"><LockKeyhole size={20} /></span>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-text">Connexion</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-subtle">Accédez à votre espace de travail documentaire sécurisé.</p>
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

        <div className="mt-6 border-t border-border pt-5 text-sm">
          <Link to="/mot-de-passe-oublie" className="font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400">
            Mot de passe oublié ?
          </Link>
          <div className="mt-5 grid gap-2 border-t border-border pt-5 text-text-muted">
            <Link to="/demande-de-stage" className="flex items-center gap-2 rounded-field px-2 py-1.5 hover:bg-surface-sunken hover:text-text"><FileText size={16} /> Déposer une demande de stage</Link>
            <Link to="/suivi-dossier" className="flex items-center gap-2 rounded-field px-2 py-1.5 hover:bg-surface-sunken hover:text-text"><FileText size={16} /> Suivre un dossier sans compte</Link>
            <Link to="/" className="flex items-center gap-2 rounded-field px-2 py-1.5 hover:bg-surface-sunken hover:text-text"><ArrowLeft size={16} /> Retour au portail public</Link>
          </div>
        </div>
      </form>
      </main>
    </div>
  );
}
