"use client";

import { useRef, useState } from "react";
import { Check, Download, Facebook, Loader2, Pencil, Save, Upload } from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { ImageEditorModal } from "@/components/creative-studio/ImageEditorModal";
import { AccountImagePickerModal } from "@/components/creative-studio/AccountImagePickerModal";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";

type EditedImage = { base64: string; mimeType: string };

function fileToBase64(file: File): Promise<EditedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",");
      resolve({ base64: base64 ?? "", mimeType: file.type || "image/png" });
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
}

/** Estúdio Criativo gera do zero via IA; o Canvas é o oposto — importa uma imagem sua
 * (foto de produto, print, o que for) e edita com o mesmo editor de texto/ajustes. */
export function CreativeCanvasView() {
  const strip = useCommandStripOptional();
  const targetClientId = strip?.clientFilter || strip?.clientOptions[0]?.slug || "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<EditedImage | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [result, setResult] = useState<EditedImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolhe um arquivo de imagem.");
      return;
    }
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const img = await fileToBase64(file);
      setSource(img);
      setEditorOpen(true);
    } catch {
      setError("Não consegui abrir essa imagem.");
    }
  };

  const download = (img: EditedImage) => {
    const a = document.createElement("a");
    a.href = `data:${img.mimeType};base64,${img.base64}`;
    a.download = "criativo.png";
    a.click();
  };

  const saveToLibrary = async (img: EditedImage) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/creative-library/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: img.base64, mimeType: img.mimeType })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();
      setSaved(true);
    } catch {
      setError("Não foi possível salvar na biblioteca.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          icon={<Upload size={16} />}
          title="Creative Canvas"
          subtitle="Importe uma imagem sua (ou de um anúncio real da conta) e edite com texto e ajustes."
          showAccountFilter={false}
          showSync={false}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {!result ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="campaign-creator-card flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--border-color)] py-16 text-center transition hover:border-[var(--ui-accent)]"
            >
              <Upload size={22} className="text-[var(--ui-accent)]" />
              <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
                Clica pra importar uma imagem
              </span>
              <span className="font-body text-[11px] text-[var(--text-dimmer)]">PNG, JPG ou WEBP</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountPickerOpen(true)}
              disabled={!targetClientId}
              className="campaign-creator-card flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--border-color)] py-16 text-center transition hover:border-[var(--ui-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Facebook size={22} className="text-[var(--ui-accent)]" />
              <span className="font-heading text-sm font-semibold text-[var(--text-main)]">
                Usar um criativo da conta
              </span>
              <span className="font-body text-[11px] text-[var(--text-dimmer)]">
                {targetClientId ? "Imagem já usada em anúncio real" : "Escolhe um cliente em \"Mostrar filtros\" primeiro"}
              </span>
            </button>
          </div>
        ) : (
          <div className="campaign-creator-card max-w-sm space-y-3 p-4">
            <div className="overflow-hidden rounded-xl border border-[var(--border-color)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:${result.mimeType};base64,${result.base64}`} alt="Editada" className="w-full" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="ui-btn-accent-outline inline-flex h-9 flex-1 items-center justify-center gap-1.5 font-body text-xs font-medium"
              >
                <Pencil size={14} strokeWidth={2} />
                Editar de novo
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => download(result)}
                className="ui-btn-accent-outline inline-flex h-9 flex-1 items-center justify-center gap-1.5 font-body text-xs font-medium"
              >
                <Download size={14} strokeWidth={2} />
                Baixar
              </button>
              {saved ? (
                <span className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 font-body text-xs font-semibold text-emerald-600">
                  <Check size={14} strokeWidth={2.5} />
                  Salva
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => saveToLibrary(result)}
                  disabled={saving}
                  className="ui-btn-accent inline-flex h-9 flex-1 items-center justify-center gap-1.5 font-body text-xs font-semibold disabled:opacity-60"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} strokeWidth={2} />}
                  Salvar na biblioteca
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setSource(null);
                setSaved(false);
                fileInputRef.current?.click();
              }}
              className="font-body text-[11px] text-[var(--text-dimmer)] underline underline-offset-2"
            >
              Importar outra imagem
            </button>
          </div>
        )}

        {error ? <p className="font-body text-xs text-red-500">{error}</p> : null}
      </div>

      {source && editorOpen ? (
        <ImageEditorModal
          open
          imageBase64={source.base64}
          mimeType={source.mimeType}
          onClose={() => setEditorOpen(false)}
          onApply={(res) => {
            setResult({ base64: res.base64, mimeType: res.mimeType });
            setSaved(false);
            setEditorOpen(false);
          }}
        />
      ) : null}

      {accountPickerOpen && targetClientId ? (
        <AccountImagePickerModal
          open
          clientId={targetClientId}
          onClose={() => setAccountPickerOpen(false)}
          onPick={(img) => {
            setSource({ base64: img.base64, mimeType: img.mimeType });
            setAccountPickerOpen(false);
            setEditorOpen(true);
          }}
        />
      ) : null}
    </AppPageShell>
  );
}
