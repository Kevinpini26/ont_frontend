import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

const toolbarBtn = (active) =>
  `rounded-field px-2.5 py-1.5 text-sm font-medium transition-colors ${
    active
      ? 'bg-ont-blue-700 text-white'
      : 'text-text-muted hover:bg-surface-sunken'
  }`;

/**
 * Éditeur de texte riche pour la rédaction des courriers (projet de
 * réponse au Secrétariat 01). Le backend ne fait que stocker/retourner ce
 * contenu structuré (JSON TipTap) — aucun rendu HTML n'est effectué côté
 * serveur, et l'affichage passe toujours par ce même éditeur (schema
 * ProseMirror), jamais par une injection HTML brute : pas de vecteur XSS.
 */
export function TipTapEditor({ content, onChange, editable = true }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content ?? '',
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
  });

  useEffect(() => {
    // `editor.isDestroyed` : un remontage d'effets (Suspense/StrictMode)
    // peut réexécuter cet effet avec une référence d'éditeur déjà détruite
    // par le nettoyage interne de useEditor avant que React ne re-rende
    // avec la nouvelle instance — sans cette garde, `editor.commands`
    // lève une TypeError sur l'état interne nul de l'instance détruite.
    if (editor && !editor.isDestroyed && content !== undefined) {
      const current = JSON.stringify(editor.getJSON());
      const next = JSON.stringify(content);
      if (current !== next) {
        editor.commands.setContent(content ?? '', { emitUpdate: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor || editor.isDestroyed) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border-strong">
      {editable && (
        <div className="flex gap-1 border-b border-border bg-surface-sunken p-1.5">
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={toolbarBtn(editor.isActive('bold'))}>
            Gras
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={toolbarBtn(editor.isActive('italic'))}>
            Italique
          </button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={toolbarBtn(editor.isActive('bulletList'))}>
            Liste
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={toolbarBtn(editor.isActive('heading', { level: 2 }))}
          >
            Titre
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="min-h-32 bg-surface px-4 py-3 text-sm text-text [&_.ProseMirror]:outline-none [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  );
}
