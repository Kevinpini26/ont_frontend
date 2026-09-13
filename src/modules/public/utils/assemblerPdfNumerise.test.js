import { describe, expect, it } from 'vitest';
import { assemblerPdfNumerise } from './assemblerPdfNumerise';

const DECODEUR = new TextDecoder('latin1');

function pageFactice(width, height, octetMarqueur) {
  return { bytes: new Uint8Array([0xff, 0xd8, octetMarqueur, 0xff, 0xd9]), width, height };
}

describe('assemblerPdfNumerise', () => {
  it('refuse un assemblage sans page', () => {
    expect(() => assemblerPdfNumerise([])).toThrow();
  });

  it('produit un en-tête PDF valide', () => {
    const pdf = assemblerPdfNumerise([pageFactice(800, 1200, 1)]);
    expect(DECODEUR.decode(pdf.slice(0, 8))).toBe('%PDF-1.4');
  });

  it('déclare autant de pages que d\'images fournies', () => {
    const pdf = assemblerPdfNumerise([pageFactice(800, 1200, 1), pageFactice(800, 1200, 2), pageFactice(800, 1200, 3)]);
    const texte = DECODEUR.decode(pdf);

    // /Type /Page (page réelle) ne doit jamais compter /Type /Pages (le
    // nœud racine) — même expression que CompteurPagesPdf côté backend.
    const occurrences = texte.match(/\/Type\s*\/Page(?!s)\b/g) ?? [];
    expect(occurrences).toHaveLength(3);
    expect(texte).toContain('/Count 3');
  });

  it('reproduit les octets JPEG de chaque page telles quelles (DCTDecode, sans réencodage)', () => {
    const pdf = assemblerPdfNumerise([pageFactice(10, 10, 0xaa), pageFactice(10, 10, 0xbb)]);
    const octets = Array.from(pdf);

    expect(octets.join(',')).toContain([0xff, 0xd8, 0xaa, 0xff, 0xd9].join(','));
    expect(octets.join(',')).toContain([0xff, 0xd8, 0xbb, 0xff, 0xd9].join(','));
  });

  it('pointe chaque décalage de la table xref sur le début réel de son objet', () => {
    const pages = [pageFactice(800, 1200, 1), pageFactice(640, 480, 2)];
    const pdf = assemblerPdfNumerise(pages);
    const texte = DECODEUR.decode(pdf);

    const debutXref = texte.indexOf('\nxref\n');
    const ligneXref = texte.slice(debutXref).split('\n');
    // ligneXref[0] = '', [1] = 'xref', [2] = '0 N', [3] = entrée libre 0, puis exactement N lignes (une par objet 1..N) avant 'trailer'.
    const nombreObjets = pages.length * 3 + 2;
    const decalagesObjets = ligneXref.slice(4, 4 + nombreObjets);

    decalagesObjets.forEach((ligne, index) => {
      const decalage = Number(ligne.slice(0, 10));
      const numeroAttendu = index + 1;
      expect(texte.slice(decalage, decalage + `${numeroAttendu} 0 obj`.length)).toBe(`${numeroAttendu} 0 obj`);
    });
  });
});
