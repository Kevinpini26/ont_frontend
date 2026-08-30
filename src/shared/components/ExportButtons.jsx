import { Button } from './ui/Button';

function toCsvValue(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Le contenu (objet de courrier, nom de stagiaire...) provient de données
// utilisateur : on échappe systématiquement avant de l'injecter dans le HTML
// de la fenêtre d'impression, pour empêcher toute exécution de script.
function escapeHtml(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Export générique d'une liste : tableur (CSV, ouvrable dans Excel) et PDF
 * (impression navigateur — "Enregistrer au format PDF" — pour éviter une
 * dépendance PDF côté client pour un simple export de liste).
 */
export function ExportButtons({ data, columns, filename = 'export' }) {
  function exportCsv() {
    const header = columns.map((c) => toCsvValue(c.label)).join(';');
    const rows = data.map((row) => columns.map((c) => toCsvValue(c.value(row))).join(';'));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const fenetre = window.open('', '_blank');
    if (!fenetre) return;

    // Hex en dur ci-dessous, à dessein : ce HTML est écrit dans une fenêtre
    // et un document entièrement séparés (aucune classe Tailwind ni variable
    // CSS de l'application n'y est chargée) — valeurs alignées sur --border
    // et --surface-sunken en thème clair (voir index.css), jamais réutilisées
    // ailleurs dans le code applicatif.

    const lignes = data
      .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(c.value(row))}</td>`).join('')}</tr>`)
      .join('');

    fenetre.document.write(`
      <!doctype html>
      <html lang="fr">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(filename)}</title>
        <style>
          body { font-family: sans-serif; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 12px; text-align: left; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h2>${escapeHtml(filename)}</h2>
        <table>
          <thead><tr>${columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
          <tbody>${lignes}</tbody>
        </table>
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `);
    fenetre.document.close();
  }

  return (
    <div className="flex gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={exportCsv}>
        Export tableur (CSV)
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={exportPdf}>
        Export PDF
      </Button>
    </div>
  );
}
