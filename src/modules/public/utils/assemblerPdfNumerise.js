const ENCODEUR = new TextEncoder();

/**
 * Assemble un PDF minimal (une page par image JPEG) entièrement côté
 * client — aucune dépendance externe (jspdf, pdf-lib...) : le poste de
 * développement n'a pas d'accès réseau au registre npm, et le projet évite
 * déjà toute bibliothèque lourde côté serveur pour la même raison (voir
 * docs/numerisation-courrier.md, absence volontaire de gd/imagick). Un
 * JPEG s'intègre tel quel dans un flux `/Filter /DCTDecode`, sans
 * réencodage : c'est ce qui rend un PDF « à la main » réaliste ici.
 *
 * Chaque page reprend telles quelles les dimensions en pixels de l'image
 * comme MediaBox (1 pixel = 1 point) : un visualiseur PDF cadre de toute
 * façon la page à sa fenêtre, la taille déclarée n'a donc pas besoin de
 * correspondre à un format physique réel.
 *
 * @param {{bytes: Uint8Array, width: number, height: number}[]} pages
 * @returns {Uint8Array}
 */
export function assemblerPdfNumerise(pages) {
  if (!pages.length) {
    throw new Error('Au moins une page est requise.');
  }

  const morceaux = [];
  let position = 0;

  function ecrire(valeur) {
    const octets = typeof valeur === 'string' ? ENCODEUR.encode(valeur) : valeur;
    morceaux.push(octets);
    position += octets.length;
  }

  // Numérotation à blanc : chaque page réserve 3 objets (page, contenu,
  // image) avant qu'on écrive le moindre octet, pour connaître à l'avance
  // le numéro de chaque référence croisée (Kids, /Contents, /XObject).
  const catalogueNum = 1;
  const pagesNum = 2;
  let prochainNumero = 3;
  const entrees = pages.map(() => ({
    pageNum: prochainNumero++,
    contenuNum: prochainNumero++,
    imageNum: prochainNumero++,
  }));
  const nombreObjets = prochainNumero - 1;
  const decalages = new Array(nombreObjets + 1).fill(0);

  function debuterObjet(numero) {
    decalages[numero] = position;
    ecrire(`${numero} 0 obj\n`);
  }

  ecrire('%PDF-1.4\n');

  debuterObjet(catalogueNum);
  ecrire(`<< /Type /Catalog /Pages ${pagesNum} 0 R >>\nendobj\n`);

  const kids = entrees.map((e) => `${e.pageNum} 0 R`).join(' ');
  debuterObjet(pagesNum);
  ecrire(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pages.length} >>\nendobj\n`);

  pages.forEach((page, i) => {
    const { pageNum, contenuNum, imageNum } = entrees[i];
    const { bytes, width, height } = page;

    debuterObjet(pageNum);
    ecrire(
      `<< /Type /Page /Parent ${pagesNum} 0 R /MediaBox [0 0 ${width} ${height}] ` +
        `/Resources << /XObject << /Im0 ${imageNum} 0 R >> >> /Contents ${contenuNum} 0 R >>\nendobj\n`,
    );

    const flux = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ`;
    debuterObjet(contenuNum);
    ecrire(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream\nendobj\n`);

    debuterObjet(imageNum);
    ecrire(
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,
    );
    ecrire(bytes);
    ecrire('\nendstream\nendobj\n');
  });

  const decalageXref = position;
  ecrire(`xref\n0 ${nombreObjets + 1}\n`);
  ecrire('0000000000 65535 f \n');
  for (let n = 1; n <= nombreObjets; n += 1) {
    ecrire(`${String(decalages[n]).padStart(10, '0')} 00000 n \n`);
  }
  ecrire(`trailer\n<< /Size ${nombreObjets + 1} /Root ${catalogueNum} 0 R >>\nstartxref\n${decalageXref}\n%%EOF`);

  const resultat = new Uint8Array(position);
  let curseur = 0;
  for (const morceau of morceaux) {
    resultat.set(morceau, curseur);
    curseur += morceau.length;
  }
  return resultat;
}
