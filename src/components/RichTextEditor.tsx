"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, type ReactNode } from "react";
import { toEditorHtml } from "@/lib/rich-text";

// ─────────────────────────────────────────────────────────────────────────────
// Éditeur de texte riche (Tiptap) pour le corps des kits de communication.
// Conserve la mise en forme au copier-coller (gras, italique, souligné, listes,
// liens) et produit du HTML propre, stocké dans la colonne `body`.
//
// `value`/`onChange` : valeur contrôlée (HTML). On accepte aussi un ancien
// texte brut en entrée (converti en HTML à l'init) pour la rétro-compatibilité.
// ─────────────────────────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()} // garde le focus dans l'éditeur
      onClick={onClick}
      className={`grid h-7 min-w-[28px] place-items-center rounded-[6px] px-1.5 text-[12px] transition-colors ${
        active
          ? "bg-[rgba(94,234,212,0.18)] text-[#5eead4]"
          : "text-[#c1d4cc] hover:bg-[rgba(255,255,255,0.06)]"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (html: string) => void;
  hint?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false, // évite un mismatch d'hydratation SSR (Next)
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: { class: "kit-rich kit-editor min-h-[150px] px-3 py-2.5 focus:outline-none" },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Synchronise une valeur externe (ex. on ouvre un autre kit dans la même
  // modale). Le garde-fou évite d'écraser le curseur sur nos propres frappes :
  // une frappe → onChange(html) → value=html === editor.getHTML() → no-op.
  useEffect(() => {
    if (!editor) return;
    const incoming = toEditorHtml(value);
    if (incoming === "" && editor.isEmpty) return;
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[200px] rounded-[9px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)]" />
    );
  }

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Lien (URL) — laisser vide pour retirer", prev ?? "");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="rounded-[9px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] focus-within:border-[rgba(94,234,212,0.4)]">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[rgba(255,255,255,0.07)] px-2 py-1.5">
        <ToolbarButton title="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <span className="font-bold">G</span>
        </ToolbarButton>
        <ToolbarButton title="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <span className="italic">I</span>
        </ToolbarButton>
        <ToolbarButton title="Souligné" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton title="Barré" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <span className="line-through">S</span>
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-[rgba(255,255,255,0.1)]" />
        <ToolbarButton title="Liste à puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          • Liste
        </ToolbarButton>
        <ToolbarButton title="Liste numérotée" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1. Liste
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-[rgba(255,255,255,0.1)]" />
        <ToolbarButton title="Titre" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          Titre
        </ToolbarButton>
        <ToolbarButton title="Lien" active={editor.isActive("link")} onClick={setLink}>
          🔗 Lien
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      {hint && <p className="px-3 pb-2 pt-0 text-[11px] leading-snug text-[#6b7c75]">{hint}</p>}
    </div>
  );
}
