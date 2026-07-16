"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CustomImage } from "./CustomImageExtension";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { useState, useCallback, useRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading2, Heading3, List, ListOrdered,
  Quote, Code, Minus, ImagePlus, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, Type,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_GOLANG_URL || "https://api.arvemart.com";

function convertToWebP(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let w = img.width;
        let h = img.height;
        if (w > MAX_WIDTH) { h = (h * MAX_WIDTH) / w; w = MAX_WIDTH; }
        if (h > MAX_HEIGHT) { w = (w * MAX_HEIGHT) / h; h = MAX_HEIGHT; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const webpFile = new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
              resolve(webpFile);
            } else {
              reject(new Error("Gagal konversi WebP"));
            }
          },
          "image/webp",
          0.85
        );
      };
      img.onerror = () => reject(new Error("Gagal load gambar"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Gagal baca file"));
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file) {
  const webpFile = await convertToWebP(file);
  const formData = new FormData();
  formData.append("file", webpFile);
  const res = await fetch(`${API_URL}/api/admin/blog/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Upload gagal");
  return json.url;
}

function ToolbarButton({ onClick, active, disabled, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
      } ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 mx-0.5" />;
}

export default function BlogEditor({ content, onChange, placeholder = "Tulis konten artikel..." }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: false,
        underline: false,
      }),
      CustomImage.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-600 underline hover:text-blue-800 cursor-pointer" } }),
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate prose-lg max-w-none focus:outline-none min-h-[300px] px-4 py-3",
      },
    },
  });

  const handleImageUpload = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(async (e) => {
    const files = e.target.files;
    if (!files?.length || !editor) return;
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch (err) {
      alert("Gagal upload gambar: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [editor]);

  const handleDrop = useCallback(async (e) => {
    if (!editor) return;
    const files = e.dataTransfer?.files;
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    e.preventDefault();
    setUploading(true);
    try {
      for (const file of imageFiles) {
        const url = await uploadImage(file);
        editor.chain().focus().setImage({ src: url }).run();
      }
    } catch (err) {
      alert("Gagal upload gambar: " + err.message);
    } finally {
      setUploading(false);
    }
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor || !linkUrl) return;
    editor.chain().focus().setLink({ href: linkUrl }).run();
    setLinkUrl("");
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 rounded-b-lg overflow-hidden bg-white">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFileChange}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive("paragraph") && !editor.isActive("heading")}
          title="Paragraf"
        >
          <Type className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Inline */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Ordered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Code Block"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Align */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <ToolbarButton
          onClick={() => {
            if (editor.isActive("link")) {
              editor.chain().focus().unsetLink().run();
            } else {
              setShowLinkInput(!showLinkInput);
            }
          }}
          active={editor.isActive("link")}
          title="Link"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>

        {/* Image */}
        <ToolbarButton onClick={handleImageUpload} disabled={uploading} title="Upload Gambar">
          <ImagePlus className="w-4 h-4" />
        </ToolbarButton>

        {uploading && (
          <span className="text-xs text-blue-600 animate-pulse ml-1">Uploading & converting WebP...</span>
        )}
      </div>

      {/* Link input bar */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-200">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && addLink()}
          />
          <button onClick={addLink} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Pasang</button>
          <button onClick={() => { setShowLinkInput(false); setLinkUrl(""); }} className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300">Batal</button>
        </div>
      )}

      {/* Editor */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative"
      >
        <EditorContent editor={editor} />
        {uploading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm text-gray-700">Mengupload & konversi WebP...</span>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .tiptap p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap { min-height: 300px; }
        .tiptap h2 { font-size: 1.5em; font-weight: 700; margin: 1em 0 0.5em; color: #1e293b; }
        .tiptap h3 { font-size: 1.25em; font-weight: 600; margin: 0.8em 0 0.4em; color: #1e293b; }
        .tiptap h4 { font-size: 1.1em; font-weight: 600; margin: 0.6em 0 0.3em; color: #1e293b; }
        .tiptap p { margin: 0.5em 0; line-height: 1.7; color: #475569; }
        .tiptap ul, .tiptap ol { padding-left: 1.5em; margin: 0.5em 0; }
        .tiptap li { margin: 0.2em 0; }
        .tiptap blockquote {
          border-left: 4px solid #8b5cf6;
          background: #f5f3ff;
          padding: 0.75em 1em;
          margin: 1em 0;
          border-radius: 0 8px 8px 0;
          color: #475569;
        }
        .tiptap pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
          font-family: monospace;
          font-size: 0.9em;
          margin: 1em 0;
        }
        .tiptap code {
          background: #f1f5f9;
          padding: 0.15em 0.4em;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.9em;
          color: #7c3aed;
        }
        .tiptap pre code {
          background: none;
          padding: 0;
          color: inherit;
        }
        .tiptap img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        .tiptap hr {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 1.5em 0;
        }
        .tiptap a {
          color: #7c3aed;
          text-decoration: underline;
          cursor: pointer;
        }
        .tiptap a:hover { color: #5b21b6; }
        .tiptap .ProseMirror-selectednode img {
          outline: 3px solid #7c3aed;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
