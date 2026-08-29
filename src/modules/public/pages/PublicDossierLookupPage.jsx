import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifierDossier } from '../api/publicApi';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';

const TONE_STATUT_SIMPLIFIE = {
  "En cours d'examen": 'info',
  'Favorable, transmis au service des stages': 'success',
  'Non retenu': 'danger',
  'En cours de traitement': 'info',
  Traité: 'success',
};

export function PublicDossierLookupPage() {
  const [searchParams] = useSearchParams();
  // Pré-remplissage depuis l'URL sans déclencher la recherche automatique :
  // le numéro seul ne suffit plus à consulter un dossier, il ne doit donc
  // plus apparaître dans l'historique du navigateur ni dans les journaux
  // d'accès une fois la recherche effectuée (voir verifierDossier, en POST).
  const [numero, setNumero] = useState(searchParams.get('numero') ?? '');
  const [nom, setNom] = useState('');
  const [dossier, setDossier] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setDossier(null);
    setEnCours(true);
    verifierDossier(numero.trim(), nom.trim())
      .then(setDossier)
      .catch((err) => setErreur(err.response?.data?.message ?? 'Aucun dossier ne correspond à ces informations.'))
      .finally(() => setEnCours(false));
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-lg font-semibold text-slate-900">Suivi de dossier</h1>
          <p className="mt-1 text-sm text-slate-500">
            Renseignez le numéro d'accusé de réception remis lors du dépôt de votre courrier, ainsi que le nom indiqué
            à cette occasion.
          </p>
        </div>

        <form onSubmit={soumettre} className="space-y-4">
          <Field label="Numéro d'accusé de réception" htmlFor="numero" required>
            <input
              id="numero"
              className={inputClass}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="AR-2026-000123"
              required
            />
          </Field>
          <Field label="Nom (ou e-mail utilisé au dépôt en ligne)" htmlFor="nom" required>
            <input
              id="nom"
              className={inputClass}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Votre nom"
              required
            />
          </Field>
          <Button type="submit" disabled={enCours} className="w-full">
            {enCours ? 'Recherche…' : 'Vérifier'}
          </Button>
        </form>

        {erreur && <Alert tone="error" className="mt-4">{erreur}</Alert>}

        {dossier && (
          <div className="mt-6 rounded-lg border border-slate-200 p-4">
            <h3 className="font-heading text-sm font-semibold text-slate-900">{dossier.objet}</h3>
            <div className="mt-2">
              <Badge tone={TONE_STATUT_SIMPLIFIE[dossier.statut_simplifie] ?? 'info'}>{dossier.statut_simplifie}</Badge>
            </div>
            <p className="mt-2 text-xs text-slate-500">Reçu le {dossier.date_reception}</p>
          </div>
        )}

        <div className="mt-6 space-y-2 text-center text-sm text-slate-500">
          <p>
            <a href="/demande-de-stage" className="font-medium text-ont-blue-700 hover:underline">
              Déposer une demande de stage →
            </a>
          </p>
          <p>
            <a href="/depot-courrier-externe" className="font-medium text-ont-blue-700 hover:underline">
              Déposer un courrier →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
