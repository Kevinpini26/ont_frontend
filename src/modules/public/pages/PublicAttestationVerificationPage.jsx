import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { verifierAttestationParNumero, verifierAttestationParToken } from '../api/publicApi';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { Badge } from '../../../shared/components/ui/Badge';
import { OntLogo } from '../../../shared/components/ui/OntLogo';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

// Les attestations émises avant l'introduction du jeton de vérification
// portent encore un QR code encodant ce numéro séquentiel — reconnaissable
// à ce format, contrairement au jeton aléatoire de 32 caractères qui l'a
// remplacé.
const FORMAT_NUMERO_ANCIEN = /^ATT-\d{4}-\d{6}$/;

export function PublicAttestationVerificationPage() {
  const { numero: parametreUrl } = useParams();
  const estNumeroAncien = parametreUrl ? FORMAT_NUMERO_ANCIEN.test(parametreUrl) : false;
  const estToken = Boolean(parametreUrl) && !estNumeroAncien;

  const [numero, setNumero] = useState(estNumeroAncien ? parametreUrl : '');
  const [nom, setNom] = useState('');
  const [attestation, setAttestation] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(estToken);
  const [recherchee, setRecherchee] = useState(false);

  useEffect(() => {
    if (!estToken) {
      return;
    }
    setRecherchee(true);
    verifierAttestationParToken(parametreUrl)
      .then(setAttestation)
      .catch((err) => setErreur(err.response?.data?.message ?? 'Aucune attestation ne correspond à ce lien.'))
      .finally(() => setEnCours(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estToken, parametreUrl]);

  function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setAttestation(null);
    setRecherchee(true);
    setEnCours(true);
    verifierAttestationParNumero(numero.trim(), nom.trim())
      .then(setAttestation)
      .catch((err) => setErreur(err.response?.data?.message ?? 'Aucune attestation ne correspond à ces informations.'))
      .finally(() => setEnCours(false));
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface-sunken px-4">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <OntLogo className="mb-3 h-12 w-12" />
          <h1 className="font-heading text-lg font-semibold text-text">
            Vérification d'attestation
          </h1>
          <p className="mt-1 text-sm text-text-subtle">
            Confirmez l'authenticité d'une attestation de stage délivrée par l'ONT.
          </p>
        </div>

        {estToken ? (
          enCours && <LoadingBlock />
        ) : (
          <form onSubmit={soumettre} className="space-y-4">
            <Field label="Numéro d'attestation" htmlFor="numero" required>
              <input
                id="numero"
                className={inputClass}
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="ATT-2026-000123"
                required
              />
            </Field>
            <Field label="Nom du stagiaire" htmlFor="nom" required>
              <input
                id="nom"
                className={inputClass}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Nom indiqué sur l'attestation"
                required
              />
            </Field>
            <Button type="submit" disabled={enCours} className="w-full">
              {enCours ? 'Vérification…' : 'Vérifier'}
            </Button>
          </form>
        )}

        {erreur && (
          <Alert tone="error" className="mt-4">
            {erreur}
          </Alert>
        )}

        {recherchee && !erreur && !enCours && attestation && (
          <div className="mt-6 rounded-lg border border-ont-green-200 bg-ont-green-50 p-4 dark:border-ont-green-800 dark:bg-ont-green-900/20">
            <Badge tone="success">Attestation authentique</Badge>
            <dl className="mt-3 space-y-1 text-sm text-text-muted">
              <div className="flex justify-between gap-4">
                <dt className="text-text-subtle">Numéro</dt>
                <dd className="font-medium">{attestation.numero_attestation}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-subtle">Stagiaire</dt>
                <dd className="font-medium">{attestation.nom}</dd>
              </div>
              {attestation.date_debut_stage && (
                <div className="flex justify-between gap-4">
                  <dt className="text-text-subtle">Période de stage</dt>
                  <dd className="font-medium">
                    {attestation.date_debut_stage} au {attestation.date_fin_stage}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-text-subtle">
          <a href="/connexion" className="font-medium text-ont-blue-700 hover:underline dark:text-ont-blue-400">
            Espace agent →
          </a>
        </p>
      </div>
    </div>
  );
}
