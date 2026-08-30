import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changerMotDePasse } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import { Button } from '../../../shared/components/ui/Button';
import { Field } from '../../../shared/components/ui/Field';
import { PasswordInput } from '../../../shared/components/ui/PasswordInput';
import { Alert } from '../../../shared/components/ui/Alert';
import { OntLogo } from '../../../shared/components/ui/OntLogo';

export function ChangerMotDePassePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [motDePasseConfirmation, setMotDePasseConfirmation] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const obligatoire = Boolean(user?.doit_changer_mot_de_passe);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    try {
      await changerMotDePasse(ancienMotDePasse, motDePasse, motDePasseConfirmation);
      setUser({ ...user, doit_changer_mot_de_passe: false });
      navigate('/');
    } catch (err) {
      setErreur(
        err.response?.data?.message ??
          Object.values(err.response?.data?.errors ?? {})[0]?.[0] ??
          'Échec du changement de mot de passe.',
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
          <h1 className="font-heading text-lg font-semibold text-text">Changer de mot de passe</h1>
          {obligatoire && (
            <p className="mt-1 text-sm text-text-subtle">
              Un mot de passe vous a été attribué par l'administrateur : choisissez-en un nouveau avant de continuer.
            </p>
          )}
        </div>

        {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}

        <div className="space-y-4">
          <Field label="Mot de passe actuel" htmlFor="ancien_mot_de_passe" required>
            <PasswordInput
              id="ancien_mot_de_passe"
              autoComplete="current-password"
              value={ancienMotDePasse}
              onChange={(e) => setAncienMotDePasse(e.target.value)}
              required
            />
          </Field>

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
            {enCours ? 'Changement…' : 'Changer mon mot de passe'}
          </Button>
        </div>
      </form>
    </div>
  );
}
