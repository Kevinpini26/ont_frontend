import { useEffect, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { apiClient } from '../api/client';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';
import { LoadingBlock } from './ui/Spinner';

/**
 * Prévisualisation authentifiée d'un document dans une modale — jamais un
 * nouvel onglet ni un téléchargement forcé. Le fetch passe par `apiClient`
 * (jeton Sanctum via son intercepteur) plutôt qu'une URL brute dans un
 * <img>/<iframe>, qui ne pourrait pas porter l'en-tête Authorization.
 *
 * PDF : rendu natif du navigateur via <embed> — pas de dépendance
 * react-pdf/pdfjs (worker files, configuration CSP) pour un outil interne où
 * le visualiseur du navigateur suffit largement. Image : <img> avec un zoom
 * simple par boutons, pas de librairie.
 */
export function DocumentPreviewModal({ open, onClose, title, url, downloadFilename }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open || !url) return;

    let urlObjet = null;
    setChargement(true);
    setErreur(null);
    setZoom(1);

    apiClient
      .get(url, { responseType: 'blob' })
      .then((response) => {
        urlObjet = URL.createObjectURL(response.data);
        setBlobUrl(urlObjet);
        setMimeType(response.headers['content-type'] ?? response.data?.type ?? 'application/octet-stream');
      })
      .catch(() => setErreur('Impossible de charger le document.'))
      .finally(() => setChargement(false));

    return () => {
      if (urlObjet) URL.revokeObjectURL(urlObjet);
      setBlobUrl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, url]);

  function telecharger() {
    if (!blobUrl) return;
    const lien = document.createElement('a');
    lien.href = blobUrl;
    lien.download = downloadFilename ?? 'document';
    lien.click();
  }

  const typeMimeNormalise = (mimeType ?? '').toLowerCase();
  const estImage = typeMimeNormalise.startsWith('image/');
  const estPdf = typeMimeNormalise.includes('application/pdf');

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="flex min-h-[60vh] flex-col gap-3">
        {chargement && <LoadingBlock />}
        {erreur && <Alert tone="error">{erreur}</Alert>}

        {!chargement && !erreur && blobUrl && (
          <>
            {estPdf && <embed src={blobUrl} type="application/pdf" className="h-[70vh] w-full rounded-field border border-border" />}

            {estImage && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} aria-label="Réduire">
                    <ZoomOut size={16} />
                  </Button>
                  <span className="font-mono text-xs text-text-subtle">{Math.round(zoom * 100)}%</span>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Agrandir">
                    <ZoomIn size={16} />
                  </Button>
                </div>
                <div className="max-h-[65vh] overflow-auto rounded-field border border-border bg-surface-sunken p-3">
                  <img
                    src={blobUrl}
                    alt={title}
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                    className="max-w-none"
                  />
                </div>
              </div>
            )}

            {!estPdf && !estImage && <Alert tone="info">Aperçu indisponible pour ce type de fichier.</Alert>}
          </>
        )}

        <div className="mt-auto flex justify-end">
          <Button type="button" variant="secondary" onClick={telecharger} disabled={!blobUrl}>
            Télécharger
          </Button>
        </div>
      </div>
    </Modal>
  );
}
