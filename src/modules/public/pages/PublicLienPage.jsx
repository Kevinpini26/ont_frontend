import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getLienPublic, signerConventionPublique, soumettreRetourPublic, telechargerConventionPublique } from '../api/lienPublicApi';
import { OntLogo } from '../../../shared/components/ui/OntLogo';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

export function PublicLienPage() {
  const { token } = useParams();
  const [lien, setLien] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    getLienPublic(token)
      .then(setLien)
      .catch((err) => setErreur(err.response?.data?.message ?? 'Ce lien est introuvable ou invalide.'))
      .finally(() => setChargement(false));
  }, [token]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface-sunken px-4 py-10">
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <OntLogo className="mb-3 h-12 w-12" />
          <h1 className="font-heading text-lg font-semibold text-text">Office National du Tourisme</h1>
        </div>

        {chargement ? (
          <LoadingBlock />
        ) : erreur || !lien ? (
          <Alert tone="error">{erreur}</Alert>
        ) : !lien.valide ? (
          <Alert tone="info">Ce lien a déjà été utilisé et n'est plus actif.</Alert>
        ) : lien.type === 'convention' ? (
          <ConventionForm token={token} lien={lien} />
        ) : (
          <RetourForm token={token} lien={lien} />
        )}
      </div>
    </div>
  );
}

function ConventionForm({ token, lien }) {
  const [signee, setSignee] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  async function signer() {
    setEnvoi(true);
    setErreur(null);
    try {
      await signerConventionPublique(token);
      setSignee(true);
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'Action impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-center text-base font-semibold text-text">Convention de stage</h2>
      <p className="mb-6 text-center text-sm text-text-subtle">
        Bonjour {lien.stagiaire.nom}, votre stage au sein de la direction {lien.stagiaire.direction} a été validé
        {lien.stagiaire.date_debut_stage && ` du ${lien.stagiaire.date_debut_stage} au ${lien.stagiaire.date_fin_stage}`}.
      </p>

      {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}

      {signee ? (
        <Alert tone="success">Convention signée avec succès. Merci.</Alert>
      ) : (
        <div className="space-y-4">
          <Button type="button" variant="secondary" className="w-full" onClick={() => telechargerConventionPublique(token)}>
            Consulter la convention (PDF)
          </Button>
          <label className="flex items-start gap-2 text-sm text-text-muted">
            <input type="checkbox" className="mt-1" onChange={(e) => e.target.checked && signer()} disabled={envoi} />
            Je certifie avoir pris connaissance de cette convention de stage et j'y appose ma signature électronique.
          </label>
        </div>
      )}
    </div>
  );
}

function RetourForm({ token }) {
  const [notes, setNotes] = useState({ note_encadrement: 3, note_missions: 3, note_ambiance: 3 });
  const [commentaire, setCommentaire] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [soumis, setSoumis] = useState(false);
  const [erreur, setErreur] = useState(null);

  const criteres = [
    { cle: 'note_encadrement', label: 'Qualité de l\'encadrement' },
    { cle: 'note_missions', label: 'Intérêt des missions confiées' },
    { cle: 'note_ambiance', label: 'Ambiance de travail' },
  ];

  async function soumettre(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    try {
      await soumettreRetourPublic(token, { ...notes, commentaire: commentaire || undefined });
      setSoumis(true);
    } catch (err) {
      setErreur(err.response?.data?.message ?? 'Action impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  if (soumis) {
    return <Alert tone="success">Merci pour votre retour ! Il restera confidentiel et ne sera jamais transmis à votre direction d'accueil.</Alert>;
  }

  return (
    <div>
      <h2 className="mb-1 text-center text-base font-semibold text-text">Votre avis sur votre stage</h2>
      <p className="mb-6 text-center text-sm text-text-subtle">
        Ce formulaire est confidentiel : vos réponses ne sont consultables que par la DFP, jamais par votre direction d'accueil.
      </p>

      {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}

      <form onSubmit={soumettre} className="space-y-4">
        {criteres.map(({ cle, label }) => (
          <Field key={cle} label={`${label} — ${notes[cle]} / 5`} htmlFor={cle}>
            <input
              id={cle}
              type="range"
              min="1"
              max="5"
              value={notes[cle]}
              onChange={(e) => setNotes((n) => ({ ...n, [cle]: Number(e.target.value) }))}
              className="w-full"
            />
          </Field>
        ))}
        <Field label="Commentaire (optionnel)" htmlFor="commentaire">
          <textarea id="commentaire" rows={3} className={inputClass} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
        </Field>
        <Button type="submit" className="w-full" disabled={envoi}>
          {envoi ? 'Envoi…' : 'Envoyer mon retour'}
        </Button>
      </form>
    </div>
  );
}
