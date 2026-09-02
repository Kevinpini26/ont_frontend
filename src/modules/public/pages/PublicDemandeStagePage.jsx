import { useEffect, useState } from 'react';
import { deposerDemandeStage, getDisponibiliteDemandesStage } from '../api/publicApi';
import { estTypeFerme } from '../utils/disponibiliteDemandes';
import { Button } from '../../../shared/components/ui/Button';
import { Field, inputClass } from '../../../shared/components/ui/Field';
import { Alert } from '../../../shared/components/ui/Alert';
import { FileUploadPreview } from '../../../shared/components/ui/FileUploadPreview';
import { Stepper } from '../../../shared/components/ui/Stepper';
import { ConfirmationDepot } from '../components/ConfirmationDepot';

const LIBELLE_TYPE = {
  academique: 'académique',
  professionnel: 'professionnel',
};

const ETAPES = ['Vos informations', 'Vos documents'];

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

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validation d'un seul champ, pour un retour en direct (au blur) plutôt qu'uniquement à la soumission. */
function validerChamp(champ, formulaire) {
  switch (champ) {
    case 'candidat_nom':
      return formulaire.candidat_nom.trim() ? null : 'Le nom complet est obligatoire.';
    case 'candidat_email':
      if (!formulaire.candidat_email.trim()) return "L'adresse e-mail est obligatoire.";
      return REGEX_EMAIL.test(formulaire.candidat_email) ? null : "Cette adresse e-mail n'est pas valide.";
    case 'candidat_etablissement':
      return formulaire.candidat_etablissement.trim() ? null : "L'établissement d'origine est obligatoire.";
    case 'type_stage':
      return formulaire.type_stage ? null : 'Choisissez un type de stage.';
    default:
      return null;
  }
}

const CHAMPS_ETAPE_1 = ['candidat_nom', 'candidat_email', 'candidat_etablissement', 'type_stage'];

export function PublicDemandeStagePage() {
  const [etape, setEtape] = useState(0);
  const [formulaire, setFormulaire] = useState(FORMULAIRE_VIDE);
  const [erreursChamps, setErreursChamps] = useState({});
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

  function validerAuBlur(champ) {
    return () => setErreursChamps((e) => ({ ...e, [champ]: validerChamp(champ, formulaire) }));
  }

  function passerALetapeDocuments() {
    const erreurs = Object.fromEntries(CHAMPS_ETAPE_1.map((c) => [c, validerChamp(c, formulaire)]));
    setErreursChamps(erreurs);
    if (Object.values(erreurs).some(Boolean)) return;
    setEtape(1);
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
      <ConfirmationDepot
        numero={numeroObtenu}
        description="Votre demande de stage a bien été reçue."
        suivi="Conservez ce numéro, il vous permettra de suivre l'état de votre dossier."
      />
    );
  }

  return (
    <div className="bg-surface-sunken py-16 lg:py-22">
      <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <p className="mb-2 text-sm font-semibold tracking-wide text-ont-gold-600 uppercase">Stage</p>
          <h1 className="font-heading text-2xl font-bold text-text">Demande de stage</h1>
          <p className="mt-1 text-sm text-text-subtle">
            Déposez votre demande de stage à l'Office National du Tourisme.
          </p>
        </div>

        <div className="rounded-card border border-border bg-white p-8 shadow-card">
        <div className="mb-6">
          <Stepper etapes={ETAPES} indexCourant={etape} />
        </div>

        {erreur && <Alert tone="error" className="mb-4">{erreur}</Alert>}

        {etape === 0 ? (
          <div className="space-y-4">
            <Field label="Nom complet" htmlFor="candidat_nom" required error={erreursChamps.candidat_nom}>
              <input
                id="candidat_nom"
                className={inputClass}
                value={formulaire.candidat_nom}
                onChange={definir('candidat_nom')}
                onBlur={validerAuBlur('candidat_nom')}
                required
              />
            </Field>
            <Field
              label="Adresse e-mail"
              htmlFor="candidat_email"
              required
              hint="Votre accusé de réception vous sera envoyé à cette adresse."
              error={erreursChamps.candidat_email}
            >
              <input
                id="candidat_email"
                type="email"
                className={inputClass}
                value={formulaire.candidat_email}
                onChange={definir('candidat_email')}
                onBlur={validerAuBlur('candidat_email')}
                required
              />
            </Field>
            <Field label="Téléphone (facultatif)" htmlFor="candidat_contact">
              <input id="candidat_contact" className={inputClass} value={formulaire.candidat_contact} onChange={definir('candidat_contact')} />
            </Field>
            <Field label="Établissement d'origine" htmlFor="candidat_etablissement" required error={erreursChamps.candidat_etablissement}>
              <input
                id="candidat_etablissement"
                className={inputClass}
                value={formulaire.candidat_etablissement}
                onChange={definir('candidat_etablissement')}
                onBlur={validerAuBlur('candidat_etablissement')}
                required
              />
            </Field>
            <Field label="Type de stage" htmlFor="type_stage" required error={erreursChamps.type_stage}>
              <select
                id="type_stage"
                className={inputClass}
                value={formulaire.type_stage}
                onChange={(e) => {
                  setFormulaire((f) => ({
                    ...f,
                    type_stage: e.target.value,
                    lettre_stage: null,
                    lettre_demande: null,
                    cv: null,
                    diplome_etat: null,
                    dernier_diplome: null,
                  }));
                  setErreursChamps((err) => ({ ...err, type_stage: null }));
                }}
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

            <Button type="button" onClick={passerALetapeDocuments} disabled={typeFerme} className="w-full">
              Continuer
            </Button>
          </div>
        ) : (
          <form onSubmit={soumettre} className="space-y-4">
            {formulaire.type_stage === 'academique' && (
              <Field
                label="Lettre de stage de l'université"
                htmlFor="lettre_stage"
                required
                hint="Lettre officielle de votre établissement introduisant votre demande de stage (PDF ou image scannée, 5 Mo max)."
              >
                <FileUploadPreview
                  id="lettre_stage"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  value={formulaire.lettre_stage}
                  onChange={(f) => setFormulaire((form) => ({ ...form, lettre_stage: f }))}
                  required
                />
              </Field>
            )}

            {formulaire.type_stage === 'professionnel' && (
              <>
                <Field
                  label="Lettre de demande de stage"
                  htmlFor="lettre_demande"
                  required
                  hint="Document principal de votre dossier (PDF ou image scannée, 5 Mo max)."
                >
                  <FileUploadPreview
                    id="lettre_demande"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    value={formulaire.lettre_demande}
                    onChange={(f) => setFormulaire((form) => ({ ...form, lettre_demande: f }))}
                    required
                  />
                </Field>
                <Field label="CV du candidat" htmlFor="cv" required hint="PDF ou image scannée, 5 Mo max.">
                  <FileUploadPreview
                    id="cv"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    value={formulaire.cv}
                    onChange={(f) => setFormulaire((form) => ({ ...form, cv: f }))}
                    required
                  />
                </Field>
                <Field label="Diplôme d'État" htmlFor="diplome_etat" required hint="PDF ou image scannée, 5 Mo max.">
                  <FileUploadPreview
                    id="diplome_etat"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    value={formulaire.diplome_etat}
                    onChange={(f) => setFormulaire((form) => ({ ...form, diplome_etat: f }))}
                    required
                  />
                </Field>
                <Field label="Dernier diplôme obtenu" htmlFor="dernier_diplome" required hint="PDF ou image scannée, 5 Mo max.">
                  <FileUploadPreview
                    id="dernier_diplome"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    value={formulaire.dernier_diplome}
                    onChange={(f) => setFormulaire((form) => ({ ...form, dernier_diplome: f }))}
                    required
                  />
                </Field>
              </>
            )}

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setEtape(0)} className="flex-1">
                Précédent
              </Button>
              <Button type="submit" disabled={envoi} className="flex-1">
                {envoi ? 'Envoi…' : 'Envoyer ma demande'}
              </Button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-subtle">
          <a href="/suivi-dossier" className="font-medium text-ont-blue-700 hover:underline">
            Suivre une demande déjà déposée →
          </a>
        </p>
        </div>
      </div>
    </div>
  );
}
