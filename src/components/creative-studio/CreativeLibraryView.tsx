"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Download,
  Globe2,
  Loader2,
  Pencil,
  Share2,
  Sparkles,
  User
} from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { useCommandStripOptional } from "@/components/layout/CommandStripContext";
import { ImageEditorModal } from "@/components/creative-studio/ImageEditorModal";

type Scope = "mine" | "community";

type LibraryItem = {
  id: string;
  headline: string;
  body: string;
  format: string;
  style: string;
  mimeType: string;
  imageBase64: string;
  visibility: "private" | "community";
  createdAt: string;
};

const ASPECT_CLASS: Record<string, string> = {
  feed: "aspect-square",
  story: "aspect-[9/16]",
  landscape: "aspect-[16/9]"
};

export function CreativeLibraryView() {
  const strip = useCommandStripOptional();
  const targetClientId = strip?.clientFilter || strip?.clientOptions[0]?.slug || "";

  const [scope, setScope] = useState<Scope>("mine");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/creative-library?scope=${scope}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; items?: LibraryItem[]; error?: string }) => {
        if (!j.ok) {
          setError(j.error ?? "Não foi possível carregar.");
          return;
        }
        setItems(j.items ?? []);
      })
      .catch(() => setError("Não foi possível carregar."))
      .finally(() => setLoading(false));
  }, [scope]);

  const toggleShare = async (item: LibraryItem) => {
    setBusyId(item.id);
    try {
      const action = item.visibility === "community" ? "unshare" : "share";
      const res = await fetch(`/api/creative-library/${item.id}/${action}`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error();
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, visibility: action === "share" ? "community" : "private" } : i
        )
      );
    } catch {
      setError("Não foi possível atualizar o compartilhamento.");
    } finally {
      setBusyId(null);
    }
  };

  const useItem = async (item: LibraryItem) => {
    if (!targetClientId) {
      setError("Escolhe um cliente de destino primeiro.");
      return;
    }
    setBusyId(item.id);
    setError(null);
    try {
      let headline = item.headline;
      let body = item.body;
      let imageBase64 = item.imageBase64;
      let mimeType = item.mimeType;

      if (scope === "community") {
        const res = await fetch(`/api/creative-library/${item.id}/reuse`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientSlug: targetClientId })
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error();
        headline = json.headline;
        body = json.body;
        imageBase64 = json.imageBase64;
        mimeType = json.mimeType;
      }

      const commitRes = await fetch("/api/creative-studio/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientSlug: targetClientId,
          imageBase64,
          mimeType,
          label: headline.slice(0, 100),
          headline,
          body,
          locale: "pt-BR"
        })
      });
      const commitJson = await commitRes.json().catch(() => null);
      if (!commitRes.ok || !commitJson?.ok) throw new Error();
      setDoneIds((prev) => new Set(prev).add(item.id));
    } catch {
      setError("Não foi possível usar esse criativo agora.");
    } finally {
      setBusyId(null);
    }
  };

  const downloadItem = (item: LibraryItem) => {
    const a = document.createElement("a");
    a.href = `data:${item.mimeType};base64,${item.imageBase64}`;
    a.download = `${item.headline.slice(0, 40).replace(/[^\w\- ]+/g, "") || "criativo"}.png`;
    a.click();
  };

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          eyebrow="Estúdio Criativo"
          icon={<Sparkles size={16} />}
          title="Biblioteca"
          subtitle="Histórico de tudo que o Estúdio Criativo já gerou — edite, reaproveite, ou compartilhe com a comunidade."
          showAccountFilter={false}
          showSync={false}
        />

        <div className="inline-flex rounded-lg border border-[var(--border-color)] p-0.5">
          <button
            type="button"
            onClick={() => setScope("mine")}
            className={
              scope === "mine"
                ? "inline-flex items-center gap-1.5 rounded-md bg-[var(--ui-accent-muted)] px-3 py-1.5 font-body text-xs font-semibold text-[var(--ui-accent)]"
                : "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-body text-xs text-[var(--text-dim)]"
            }
          >
            <User size={12} />
            Meu histórico
          </button>
          <button
            type="button"
            onClick={() => setScope("community")}
            className={
              scope === "community"
                ? "inline-flex items-center gap-1.5 rounded-md bg-[var(--ui-accent-muted)] px-3 py-1.5 font-body text-xs font-semibold text-[var(--ui-accent)]"
                : "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-body text-xs text-[var(--text-dim)]"
            }
          >
            <Globe2 size={12} />
            Comunidade
          </button>
        </div>

        {!targetClientId ? (
          <p className="font-body text-[11px] text-[var(--text-dimmer)]">
            Escolhe um cliente em &quot;Mostrar filtros&quot; pra poder usar os criativos daqui.
          </p>
        ) : null}

        {scope === "community" ? (
          <p className="font-body text-[11px] leading-relaxed text-[var(--text-dimmer)]">
            Criativos compartilhados por qualquer agência no Orion — nunca mostra de qual cliente ou
            agência veio, só a imagem e a copy.
          </p>
        ) : null}

        {error ? <p className="font-body text-xs text-red-500">{error}</p> : null}

        {loading ? (
          <div className="flex items-center gap-2 font-body text-xs text-[var(--text-dim)]">
            <Loader2 size={14} className="animate-spin" />
            Carregando…
          </div>
        ) : items.length === 0 ? (
          <p className="font-body text-xs text-[var(--text-dim)]">
            {scope === "mine" ? "Nenhuma geração ainda — vai no Estúdio Criativo." : "Ninguém compartilhou nada ainda."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="campaign-creator-card overflow-hidden">
                <div
                  className={`relative w-full overflow-hidden bg-[var(--ui-accent-muted)] ${ASPECT_CLASS[item.format] ?? "aspect-square"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${item.mimeType};base64,${item.imageBase64}`}
                    alt={item.headline}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <p className="font-heading text-xs font-semibold text-[var(--text-main)]">{item.headline}</p>
                  <p className="line-clamp-2 font-body text-[11px] leading-relaxed text-[var(--text-dim)]">
                    {item.body}
                  </p>

                  {doneIds.has(item.id) ? (
                    <div className="flex items-center gap-1.5 font-body text-[11px] font-semibold text-emerald-500">
                      <Check size={13} /> Usado no Criador
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => useItem(item)}
                        disabled={busyId !== null}
                        className="ui-btn-accent-outline inline-flex h-7 flex-1 items-center justify-center gap-1.5 font-body text-[11px] font-medium disabled:opacity-60"
                      >
                        {busyId === item.id ? <Loader2 size={12} className="animate-spin" /> : null}
                        {scope === "community" ? "Usar foto + copy" : "Usar neste cliente"}
                      </button>
                      {scope === "mine" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            disabled={busyId !== null}
                            aria-label="Editar"
                            title="Editar"
                            className="ui-btn-accent-outline inline-flex h-7 w-7 shrink-0 items-center justify-center disabled:opacity-60"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleShare(item)}
                            disabled={busyId !== null}
                            aria-label={item.visibility === "community" ? "Descompartilhar" : "Compartilhar"}
                            title={item.visibility === "community" ? "Compartilhado — clique pra remover" : "Compartilhar na comunidade"}
                            className={
                              item.visibility === "community"
                                ? "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)] disabled:opacity-60"
                                : "ui-btn-accent-outline inline-flex h-7 w-7 shrink-0 items-center justify-center disabled:opacity-60"
                            }
                          >
                            <Share2 size={12} />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => downloadItem(item)}
                          aria-label="Baixar imagem"
                          title="Baixar imagem"
                          className="ui-btn-accent-outline inline-flex h-7 w-7 shrink-0 items-center justify-center"
                        >
                          <Download size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingItem ? (
        <ImageEditorModal
          open
          imageBase64={editingItem.imageBase64}
          mimeType={editingItem.mimeType}
          initialText={editingItem.headline}
          onClose={() => setEditingItem(null)}
          onApply={(result) => {
            setItems((prev) =>
              prev.map((i) => (i.id === editingItem.id ? { ...i, imageBase64: result.base64, mimeType: result.mimeType } : i))
            );
            setEditingItem(null);
          }}
        />
      ) : null}
    </AppPageShell>
  );
}
