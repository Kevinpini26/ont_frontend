import { useEffect, useState } from 'react';
import { deposerDemandeStage, getDisponibiliteDemandesStage } from '../api/publicApi';
import { estTypeFerme } from '../utils/disponibiliteDemandes';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';

const LIBELLE_TYPE = {
  academique: 'académique',
  professionnel: 'professionnel',
};

const FORMULAIRE_VIDE = {
  candidat_nom: '',
  candidat_email: '',
  candidat_contact: '',
  candidat_etablissement: '',
  type_stage: '',
  lettre_stage: null,
  lettre_demande: null,
  cv: null,
  diplome_etat: null,
  dernier_diplome: null,
};

export function PublicDemandeStagePage() {
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [numeroObtenu, setNumeroObtenu] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [disponibilite, setDisponibilite] = useState(null);

  useEffect(() => {
    getDisponibiliteDemandesStage().then(setDisponibilite);
  }, []);

  const typeFerme = estTypeFerme(disponibilite, formulaire.type_stage);

  function definir(champ) {
    return (e) => setFormulaire((f) => ({ ...f, [champ]: e.target.value }));
  }

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const { numero_accuse_reception } = await deposerDemandeStage(formulaire);
      setNumeroObtenu(numero_accuse_reception);
    } catch (err) {
      setErreur(
        err.response?.data?.message ??
          Object.values(err.response?.data?.errors ?? {})[0]?.[0] ??
          'Échec du dépôt de la demande.',
      );
    } finally {
      setEnvoi(false);
    }
  }

  if (numeroObtenu) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-card border border-border bg-surface p-8 text-center shadow-sm">
          <h1 className="font-heading text-lg font-semibold text-text">Demande envoyée</h1>
          <p className="mt-2 text-sm text-text-muted">
            Votre demande de stage a bien été reçue. Un e-mail de confirmation vous a été envoyé avec votre numéro
            d'accusé de réception :
          </p>
          <p className="mt-3 rounded-md bg-ont-blue-50 px-3 py-2 font-mono text-sm font-semibold text-ont-blue-800">
            {numeroObtenu}
          </p>
          <p className="mt-3 text-xs text-text-subtle">
            Conservez ce numéro, il vous permettra de suivre l'état de votre dossier.
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
          <h1 className="font-heading text-lg font-semibold text-text">Demande de stage</h1>
          <p className="mt-1 text-sm text-text-subtle">
            Déposez votre demande de stage à l'Office National du Tourisme.
          </p>
        </div>

        {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}

        <form onSubmit={soumettre} className="space-y-4">
          <Field label="Nom complet" htmlFor="candidat_nom" required>
            <input id="candidat_nom" className={inputClass} value={formulaire.candidat_nom} onChange={definir('candidat_nom')} required />
          </Field>
          <Field label="Adresse e-mail" htmlFor="candidat_email" required hint="Votre accusé de réception vous sera envoyé à cette adresse.">
            <input
              id="candidat_email"
              type="email"
              className={inputClass}
              value={formulaire.candidat_email}
              onChange={definir('candidat_email')}
              required
            />
          </Field>
          <Field label="Téléphone (facultatif)" htmlFor="candidat_contact">
            <input id="candidat_contact" className={inputClass} value={formulaire.candidat_contact} onChange={definir('candidat_contact')} />
          </Field>
          <Field label="Établissement d'origine" htmlFor="candidat_etablissement" required>
            <input
              id="candidat_etablissement"
              className={inputClass}
              value={formulaire.candidat_etablissement}
              onChange={definir('candidat_etablissement')}
              required
            />
          </Field>
          <Field label="Type de stage" htmlFor="type_stage" required>
            <select
              id="type_stage"
              className={inputClass}
              value={formulaire.type_stage}
              onChange={(e) =>
                setFormulaire((f) => ({
                  ...f,
                  type_stage: e.target.value,
                  lettre_stage: null,
                  lettre_demande: null,
                  cv: null,
                  diplome_etat: null,
                  dernier_diplome: null,
                }))
              }
              required
            >
              <option value="">Choisissez…</option>
              <option value="academique">Stage académique</option>
              <option value="professionnel">Stage professionnel</option>
            </select>
          </Field>

          {typeFerme && (
            <Alert tone="info">
              Les demandes de stage {LIBELLE_TYPE[formulaire.type_stage]} ne sont pas ouvertes actuellement. Revenez
              plus tard ou consultez nos disponibilités.
            </Alert>
          )}

          {!typeFerme && formulaire.type_stage === 'academique' && (
            <Field
              label="Lettre de stage de l'université"
              htmlFor="lettre_stage"
              required
              hint="Lettre officielle de votre établissement introduisant votre demande de stage (PDF ou image scannée, 5 Mo max)."
            >
              <input
                id="lettre_stage"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className={inputClass}
                onChange={(e) => setFormulaire((f) => ({ ...f, lettre_stage: e.target.files?.[0] ?? null }))}
                required
              />
            </Field>
          )}

          {!typeFerme && formulaire.type_stage === 'professionnel' && (
            <>
              <Field
                label="Lettre de demande de stage"
                htmlFor="lettre_demande"
                required
                hint="Document principal de votre dossier (PDF ou image scannée, 5 Mo max)."
              >
                <input
                  id="lettre_demande"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className={inputClass}
                  onChange={(e) => setFormulaire((f) => ({ ...f, lettre_demande: e.target.files?.[0] ?? null }))}
                  required
                />
              </Field>
              <Field label="CV du candidat" htmlFor="cv" required hint="PDF ou image scannée, 5 Mo max.">
                <input
                  id="cv"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className={inputClass}
                  onChange={(e) => setFormulaire((f) => ({ ...f, cv: e.target.files?.[0] ?? null }))}
                  required
                />
              </Field>
              <Field label="Diplôme d'État" htmlFor="diplome_etat" required hint="PDF ou image scannée, 5 Mo max.">
                <input
                  id="diplome_etat"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className={inputClass}
                  onChange={(e) => setFormulaire((f) => ({ ...f, diplome_etat: e.target.files?.[0] ?? null }))}
                  required
                />
              </Field>
              <Field label="Dernier diplôme obtenu" htmlFor="dernier_diplome" required hint="PDF ou image scannée, 5 Mo max.">
                <input
                  id="dernier_diplome"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className={inputClass}
                  onChange={(e) => setFormulaire((f) => ({ ...f, dernier_diplome: e.target.files?.[0] ?? null }))}
                  required
                />
              </Field>
            </>
          )}

          <Button type="submit" disabled={envoi || !formulaire.type_stage || typeFerme} className="w-full">
            {envoi ? 'Envoi…' : 'Envoyer ma demande'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-subtle">
          <a href="/suivi-dossier" className="font-medium text-ont-blue-700 hover:underline">
            Suivre une demande déjà déposée →
          </a>
        </p>
      </div>
    </div>
  );
}
