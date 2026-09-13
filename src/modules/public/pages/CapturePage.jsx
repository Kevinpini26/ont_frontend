import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Camera, RotateCw, Trash2 } from 'lucide-react';
import { getCaptureInfo, soumettreCapture } from '../api/captureNumerisationApi';
import { capturerPagePhoto } from '../utils/capturePagePhoto';
import { assemblerPdfNumerise } from '../utils/assemblerPdfNumerise';
import { OntLogo } from '../../../shared/components/ui/OntLogo';
import { Button } from '../../../shared/components/ui/Button';
import { Alert } from '../../../shared/components/ui/Alert';
import { LoadingBlock } from '../../../shared/components/ui/Spinner';

/**
 * Page publique (sans authentification) ouverte depuis le lien/QR généré
 * par un agent de la Réception — voir docs/numerisation-courrier.md (Lot
 * 1). Le jeton (48 caractères, 15 min, usage unique) tient lieu
 * d'autorisation ; toute la préparation d'image (compression, noir et
 * blanc, rotation) et l'assemblage du PDF se font ici, dans le navigateur
 * — le serveur n'a ni gd ni imagick.
 */
export function CapturePage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [erreurChargement, setErreurChargement] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [pages, setPages] = useState([]);
  const [noirEtBlanc, setNoirEtBlanc] = useState(true);
  const [enTraitement, setEnTraitement] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState(null);
  const [resultat, setResultat] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getCaptureInfo(token)
      .then(setInfo)
      .catch((err) =>
        // `||`, pas `??` : un 404 générique (abort(404) sans message
        // explicite, voir CaptureNumerisationPublicController) répond avec
        // message: "" — une chaîne vide n'est jamais nullish, ?? la
        // laisserait passer telle quelle et l'alerte s'afficherait vide.
        setErreurChargement(err.response?.data?.message || 'Ce lien de capture est introuvable ou a expiré.'),
      )
      .finally(() => setChargement(false));
  }, [token]);

  useEffect(
    () => () => {
      pages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  async function ajouterPages(fichiers) {
    setEnTraitement(true);
    try {
      for (const fichier of fichiers) {
        // eslint-disable-next-line no-await-in-loop
        const page = await capturerPagePhoto(fichier, { noirEtBlanc });
        setPages((precedent) => [
          ...precedent,
          { id: crypto.randomUUID(), fichierOriginal: fichier, rotationDeg: 0, previewUrl: URL.createObjectURL(page.blob), ...page },
        ]);
      }
    } finally {
      setEnTraitement(false);
    }
  }

  async function pivoter(id) {
    const page = pages.find((p) => p.id === id);
    if (!page) return;

    const nouvelleRotation = (page.rotationDeg + 90) % 360;
    setEnTraitement(true);
    try {
      // Toujours repartie de la photo originale, jamais du JPEG déjà
      // recompressé : pivoter plusieurs fois de suite ne dégrade donc
      // jamais la qualité de l'image.
      const recalculee = await capturerPagePhoto(page.fichierOriginal, { noirEtBlanc, rotationDeg: nouvelleRotation });
      URL.revokeObjectURL(page.previewUrl);
      setPages((precedent) =>
        precedent.map((p) =>
          p.id === id ? { ...p, ...recalculee, rotationDeg: nouvelleRotation, previewUrl: URL.createObjectURL(recalculee.blob) } : p,
        ),
      );
    } finally {
      setEnTraitement(false);
    }
  }

  function retirer(id) {
    setPages((precedent) => {
      const page = precedent.find((p) => p.id === id);
      if (page) URL.revokeObjectURL(page.previewUrl);
      return precedent.filter((p) => p.id !== id);
    });
  }

  async function envoyer() {
    setEnvoiEnCours(true);
    setErreurEnvoi(null);
    try {
      const pdfOctets = assemblerPdfNumerise(pages.map((p) => ({ bytes: p.bytes, width: p.width, height: p.height })));
      const pdfBlob = new Blob([pdfOctets], { type: 'application/pdf' });
      const reponse = await soumettreCapture(token, pdfBlob, pages.length);
      setResultat(reponse.document);
      pages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPages([]);
    } catch (err) {
      setErreurEnvoi(err.response?.data?.message || "Échec de l'envoi — le lien a peut-être expiré ou déjà été utilisé.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface-sunken px-4 py-10">
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <OntLogo className="mb-3 h-12 w-12" />
          <h1 className="font-heading text-lg font-semibold text-text">Numérisation mobile</h1>
        </div>

        {chargement ? (
          <LoadingBlock />
        ) : erreurChargement || !info ? (
          <Alert tone="error">{erreurChargement}</Alert>
        ) : resultat ? (
          <Alert tone="success">
            Document reçu avec succès — version {resultat.version}
            {resultat.nombre_pages ? `, ${resultat.nombre_pages} page(s)` : ''}. Vous pouvez fermer cette page.
          </Alert>
        ) : (
          <div className="space-y-5">
            <p className="text-center text-sm text-text-muted">
              Dossier à numériser : <span className="font-medium text-text">{info.cible_libelle}</span>
              <br />
              <span className="text-xs text-text-subtle">
                Ce lien expire à {new Date(info.expire_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — à usage
                unique.
              </span>
            </p>

            {erreurEnvoi && <Alert tone="error">{erreurEnvoi}</Alert>}

            <label className="flex items-center gap-2 text-sm text-text-muted">
              <input type="checkbox" checked={noirEtBlanc} onChange={(e) => setNoirEtBlanc(e.target.checked)} />
              Noir et blanc (recommandé — fichier plus léger, capture plus fiable)
            </label>

            {pages.length > 0 && (
              <ul className="grid grid-cols-3 gap-3">
                {pages.map((page, index) => (
                  <li key={page.id} className="relative overflow-hidden rounded-field border border-border">
                    <img src={page.previewUrl} alt={`Page ${index + 1}`} className="aspect-[3/4] w-full object-cover" />
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">
                      {index + 1}
                    </span>
                    <div className="absolute bottom-1 right-1 flex gap-1">
                      <button
                        type="button"
                        aria-label={`Pivoter la page ${index + 1}`}
                        disabled={enTraitement}
                        onClick={() => pivoter(page.id)}
                        className="rounded bg-black/60 p-1 text-white hover:bg-black/80 disabled:opacity-50"
                      >
                        <RotateCw size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Retirer la page ${index + 1}`}
                        onClick={() => retirer(page.id)}
                        className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                const fichiers = Array.from(e.target.files ?? []);
                e.target.value = '';
                if (fichiers.length) ajouterPages(fichiers);
              }}
            />
            <Button type="button" variant="secondary" className="w-full" disabled={enTraitement} onClick={() => inputRef.current?.click()}>
              <Camera size={18} />
              {enTraitement ? 'Préparation…' : pages.length ? 'Ajouter une page' : 'Prendre la première photo'}
            </Button>

            <Button type="button" className="w-full" disabled={!pages.length || envoiEnCours || enTraitement} onClick={envoyer}>
              {envoiEnCours ? 'Envoi…' : `Envoyer (${pages.length} page${pages.length > 1 ? 's' : ''})`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
