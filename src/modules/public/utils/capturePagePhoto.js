/**
 * Prépare une photo capturée (téléphone) pour l'assemblage PDF : aucune
 * préparation d'image ne peut se faire côté serveur (pas de gd/imagick,
 * voir docs/numerisation-courrier.md) — recadrage, redressement,
 * compression et passage en noir et blanc se font ici, dans le navigateur.
 *
 * @param {File|Blob} fichier
 * @param {{ dimensionMax?: number, qualite?: number, noirEtBlanc?: boolean, rotationDeg?: 0|90|180|270 }} options
 * @returns {Promise<{ blob: Blob, bytes: Uint8Array, width: number, height: number }>}
 */
export async function capturerPagePhoto(
  fichier,
  { dimensionMax = 1600, qualite = 0.75, noirEtBlanc = true, rotationDeg = 0 } = {},
) {
  // { imageOrientation: 'from-image' } applique la rotation EXIF du
  // téléphone à la décodification — sans ça, une photo prise en portrait
  // ressortirait couchée dans le PDF (l'orientation EXIF est une métadonnée,
  // pas un pivot des pixels eux-mêmes).
  const bitmap = await createImageBitmap(fichier, { imageOrientation: 'from-image' });

  const echelle = Math.min(1, dimensionMax / Math.max(bitmap.width, bitmap.height));
  const largeurCible = Math.round(bitmap.width * echelle);
  const hauteurCible = Math.round(bitmap.height * echelle);
  const pivote = rotationDeg % 180 !== 0;

  const canvas = document.createElement('canvas');
  canvas.width = pivote ? hauteurCible : largeurCible;
  canvas.height = pivote ? largeurCible : hauteurCible;

  const ctx = canvas.getContext('2d');
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.drawImage(bitmap, -largeurCible / 2, -hauteurCible / 2, largeurCible, hauteurCible);
  bitmap.close();

  if (noirEtBlanc) {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = image.data;
    for (let i = 0; i < d.length; i += 4) {
      const gris = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = gris;
      d[i + 1] = gris;
      d[i + 2] = gris;
    }
    ctx.putImageData(image, 0, 0);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualite));
  const bytes = new Uint8Array(await blob.arrayBuffer());

  return { blob, bytes, width: canvas.width, height: canvas.height };
}
