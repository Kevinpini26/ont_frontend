import { useEditor, EditorContent } from '@tiptap/react';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';
import { Heading } from '@tiptap/extension-heading';
import { BulletList } from '@tiptap/extension-bullet-list';
import { ListItem } from '@tiptap/extension-list-item';
import { UndoRedo } from '@tiptap/extensions';
import { useEffect } from 'react';

// Jeu d'extensions minimal (pas @tiptap/starter-kit) : la barre d'outils
// n'expose que Gras/Italique/Liste/Titre — StarterKit embarque en plus
// Blockquote, Code(Block), HorizontalRule, Link, Underline, Strike...
// jamais utilisés ici, pour ~123 Ko de JS non exécuté (mesuré via l'audit
// Lighthouse "unused-javascript" sur /depot-courrier-externe).
const EXTENSIONS = [Document, Paragraph, Text, Bold, Italic, Heading.configure({ levels: [2] }), BulletList, ListItem, UndoRedo];

/**
 * Un document ProseMirror { type: 'doc', content: [] } (zéro bloc) est
 * invalide pour ce schéma ("doc: block+", au moins un bloc) — Editor.
 * createView() plante alors sur un état interne jamais initialisé,
 * plutôt que de lever une erreur de validation lisible. Toujours
 * illégitime en usage normal (voir CourrierFactory), mais un contenu
 * corrompu ne doit pas faire disparaître toute la page derrière l'écran
 * d'erreur générique : on retombe sur un document vide valide.
 */
function contenuValide(content) {
  if (content && typeof content === 'object' && content.type === 'doc' && Array.isArray(content.content) && content.content.length === 0) {
    return '';
  }
  return content ?? '';
}

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
export function TipTapEditor({ content, onChange, editable = true, id }) {
  const editor = useEditor({
    // Sans ce réglage, useEditor crée la vue ProseMirror dès le rendu
    // initial — un double rendu strict de React (StrictMode, activé en
    // développement dans main.jsx) peut alors laisser une vue à moitié
    // construite (`Cannot read properties of undefined
    // (reading 'dispatchTransaction')`, TipTapEditor plantant sur tout
    // courrier dont le contenu est réellement affiché). Différer la
    // création à un effet (après le montage) rend l'initialisation
    // résiliente à ce double rendu.
    immediatelyRender: false,
    extensions: EXTENSIONS,
    content: contenuValide(content),
    editable,
    onUpdate: ({ editor }) => onChange?.(editor.getJSON()),
    // `id` posé ici (et non sur EditorContent) : ProseMirror monte son
    // propre <div contenteditable> comme enfant du wrapper d'EditorContent
    // — un <label htmlFor> ne donne un nom accessible qu'en ciblant cet
    // élément-là, celui qui porte réellement le rôle textbox.
    editorProps: id ? { attributes: { id } } : undefined,
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
        editor.commands.setContent(contenuValide(content), { emitUpdate: false });
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
