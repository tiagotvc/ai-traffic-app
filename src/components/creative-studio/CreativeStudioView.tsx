"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import {
  AlertTriangle,
  Check,
  Coins,
  Copy,
  ExternalLink,
  Library,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Type,
  Wand2
} from "lucide-react";

import { AppPageShell } from "@/components/layout/AppPageShell";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { Link } from "@/i18n/navigation";
import { ImageEditorModal } from "@/components/creative-studio/ImageEditorModal";

type Format = "feed" | "story" | "landscape";
type Style = "photo" | "bold" | "minimal";
type InputMode = "describe" | "link";

const FORMAT_OPTIONS: Array<{ id: Format; label: string }> = [
  { id: "feed", label: "Post feed (1:1)" },
  { id: "story", label: "Story/Reels (9:16)" },
  { id: "landscape", label: "Paisagem (16:9)" }
];

const STYLE_OPTIONS: Array<{ id: Style; label: string }> = [
  { id: "photo", label: "Foto realista" },
  { id: "bold", label: "Bold / chamativo" },
  { id: "minimal", label: "Minimalista" }
];

/** Preview tem que respeitar o formato escolhido — story/reels gerado em 9:16 não pode
 * aparecer cortado num quadrado, senão o que você vê aqui mente sobre o que vai pro anúncio. */
const ASPECT_CLASS: Record<Format, string> = {
  feed: "aspect-square",
  story: "aspect-[9/16]",
  landscape: "aspect-[16/9]"
};

const FULL_BATCH = 4;

type Variant = {
  imageBase64: string;
  mimeType: string;
  headline: string;
  body: string;
};

type Insight = { adName: string; ctr: number } | null;
type Credits = { used: number; remaining: number; limit: number } | null;

function formatCreditsSummary(credits: Credits): string | null {
  if (!credits) return null;
  const remainingText =
    credits.limit < 0 || credits.remaining < 0
      ? "créditos ilimitados no plano"
      : `${credits.remaining} crédito${credits.remaining === 1 ? "" : "s"} restante${credits.remaining === 1 ? "" : "s"} este mês`;
  return `Essa geração usou ${credits.used} crédito${credits.used === 1 ? "" : "s"} · ${remainingText}`;
}

/** Lê como texto primeiro — uma resposta não-JSON (erro de rede, overlay de dev) vira uma
 * mensagem legível em vez de estourar o parser do `res.json()` com um erro ilegível. */
async function parseJsonResponse(res: Response): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("[creative-studio] resposta não-JSON:", text.slice(0, 500));
    return { ok: false, error: `Erro inesperado do servidor (HTTP ${res.status}). Tenta de novo.` };
  }
}

export function CreativeStudioView({
  clientSlug,
  clientName
}: {
  clientSlug: string;
  clientName: string;
}) {
  const locale = useLocale();
  const [mode, setMode] = useState<InputMode>("describe");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [format, setFormat] = useState<Format>("feed");
  const [style, setStyle] = useState<Style>("photo");

  const [loading, setLoading] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  /** Fase real emitida pelo servidor (SSE) — nunca decorativa, mesmo padrão do Commander. */
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[] | null>(null);
  const [insight, setInsight] = useState<Insight>(null);
  const [credits, setCredits] = useState<Credits>(null);

  const [committing, setCommitting] = useState<number | null>(null);
  const [usedIndexes, setUsedIndexes] = useState<Set<number>>(new Set());
  const [lastDraftId, setLastDraftId] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const busy = loading || regeneratingIndex !== null;
  const pendingSlots = loading ? Math.max(0, FULL_BATCH - (variants?.length ?? 0)) : 0;

  /** Chama a geração via SSE. `onVariant` recebe cada card assim que fica pronto (progressivo). */
  const runGenerateSSE = async (
    count: number | undefined,
    onVariant?: (v: Variant) => void
  ): Promise<{ variants: Variant[]; insight: Insight; credits: Credits }> => {
    const res = await fetch("/api/creative-studio/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        clientSlug,
        ...(mode === "link" ? { sourceUrl: sourceUrl.trim() } : { description: description.trim() }),
        format,
        style,
        ...(count ? { count } : {})
      })
    });

    if (!res.ok || !res.body) {
      const json = await parseJsonResponse(res);
      throw new Error(json.error || "Não foi possível gerar agora.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let doneEvent: { variants: Variant[]; insight: Insight; credits: Credits } | null = null;
    let errorMsg: string | null = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        const line = chunk.trim();
        if (!line.startsWith("data:")) continue;
        let event: Record<string, unknown> | null = null;
        try {
          event = JSON.parse(line.slice(5).trim());
        } catch {
          continue;
        }
        if (!event) continue;
        if (event.phase === "status") setStatusLabel(event.label as string);
        else if (event.phase === "variant") onVariant?.(event.variant as Variant);
        else if (event.phase === "done") {
          doneEvent = {
            variants: event.variants as Variant[],
            insight: (event.insight as Insight) ?? null,
            credits: (event.credits as Credits) ?? null
          };
        } else if (event.phase === "error") errorMsg = event.error as string;
      }
    }

    if (errorMsg) throw new Error(errorMsg);
    if (!doneEvent) throw new Error("Não foi possível gerar agora.");
    return doneEvent;
  };

  const generate = async () => {
    if (mode === "describe" && description.trim().length < 4) {
      setError("Descreve rapidamente o que você tá anunciando.");
      return;
    }
    if (mode === "link" && !/^https?:\/\//i.test(sourceUrl.trim())) {
      setError("Cola um link válido (começando com http:// ou https://).");
      return;
    }
    setLoading(true);
    setError(null);
    setUsedIndexes(new Set());
    setLastDraftId(null);
    setVariants([]);
    try {
      const result = await runGenerateSSE(undefined, (v) =>
        setVariants((prev) => (prev ? [...prev, v] : [v]))
      );
      setVariants(result.variants);
      setInsight(result.insight);
      setCredits(result.credits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar criativos");
      setVariants(null);
    } finally {
      setLoading(false);
      setStatusLabel(null);
    }
  };

  const regenerateOne = async (index: number) => {
    if (busy) return;
    setRegeneratingIndex(index);
    setError(null);
    try {
      const result = await runGenerateSSE(1);
      const fresh = result.variants[0];
      if (fresh) {
        setVariants((prev) => (prev ? prev.map((v, i) => (i === index ? fresh : v)) : prev));
        setUsedIndexes((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
      if (result.credits) setCredits(result.credits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar variação");
    } finally {
      setRegeneratingIndex(null);
      setStatusLabel(null);
    }
  };

  const updateVariantText = (index: number, field: "headline" | "body", value: string) => {
    setVariants((prev) => (prev ? prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)) : prev));
  };

  const updateVariantImage = (index: number, image: { base64: string; mimeType: string }) => {
    setVariants((prev) =>
      prev ? prev.map((v, i) => (i === index ? { ...v, imageBase64: image.base64, mimeType: image.mimeType } : v)) : prev
    );
  };

  const useVariant = async (index: number) => {
    const v = variants?.[index];
    if (!v) return;
    setCommitting(index);
    setError(null);
    try {
      const res = await fetch("/api/creative-studio/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientSlug,
          imageBase64: v.imageBase64,
          mimeType: v.mimeType,
          label: v.headline.slice(0, 100),
          headline: v.headline,
          body: v.body,
          locale
        })
      });
      const json = await parseJsonResponse(res);
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Falha ao enviar imagem pra Meta");
      }
      setUsedIndexes((prev) => new Set(prev).add(index));
      if (typeof json.draftId === "string") setLastDraftId(json.draftId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar imagem pra Meta");
    } finally {
      setCommitting(null);
    }
  };

  return (
    <AppPageShell as="main" gap="loose" className="flex-1 overflow-y-auto">
      <div className="space-y-6">
        <PageToolbar
          eyebrow="Estúdio Criativo"
          icon={<Sparkles size={16} />}
          title="Geração"
          subtitle={`Gere imagem + copy prontos pro anúncio de ${clientName} — sem editor complexo.`}
          showAccountFilter={false}
          showSync={false}
          actions={
            <Link
              href="/creative-library"
              className="ui-btn-accent-outline inline-flex h-8 items-center gap-1.5 px-3 font-body text-xs font-medium"
            >
              <Library size={13} />
              Biblioteca
            </Link>
          }
        />

        <div className="campaign-creator-card space-y-4 p-4">
          <div className="inline-flex rounded-lg border border-[var(--border-color)] p-0.5">
            <button
              type="button"
              onClick={() => setMode("describe")}
              className={
                mode === "describe"
                  ? "inline-flex items-center gap-1.5 rounded-md bg-[var(--ui-accent-muted)] px-3 py-1.5 font-body text-xs font-semibold text-[var(--ui-accent)]"
                  : "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-body text-xs text-[var(--text-dim)]"
              }
            >
              <Type size={12} />
              Descrever
            </button>
            <button
              type="button"
              onClick={() => setMode("link")}
              className={
                mode === "link"
                  ? "inline-flex items-center gap-1.5 rounded-md bg-[var(--ui-accent-muted)] px-3 py-1.5 font-body text-xs font-semibold text-[var(--ui-accent)]"
                  : "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-body text-xs text-[var(--text-dim)]"
              }
            >
              <Link2 size={12} />
              Colar um link
            </button>
          </div>

          {mode === "describe" ? (
            <div>
              <p className="mb-1.5 font-heading text-[11px] font-bold uppercase tracking-wide text-[var(--text-dimmer)]">
                O que você tá anunciando?
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: agenda de consultas — leads pra clínica de estética, foco em agendamento rápido pelo WhatsApp"
                rows={2}
                className="ui-input w-full resize-none font-body text-sm"
              />
            </div>
          ) : (
            <div>
              <p className="mb-1.5 font-heading text-[11px] font-bold uppercase tracking-wide text-[var(--text-dimmer)]">
                Link do produto/post/site
              </p>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="ui-input w-full font-body text-sm"
              />
              <p className="mt-1 font-body text-[10.5px] text-[var(--text-dimmer)]">
                A IA lê o título e a descrição da página pra montar a oferta sozinha.
              </p>
            </div>
          )}

          <div>
            <p className="mb-1.5 font-heading text-[11px] font-bold uppercase tracking-wide text-[var(--text-dimmer)]">
              Formato
            </p>
            <div className="flex flex-wrap gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormat(opt.id)}
                  className={
                    format === opt.id
                      ? "rounded-lg border border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] px-3 py-1.5 font-body text-xs font-semibold text-[var(--ui-accent)]"
                      : "rounded-lg border border-[var(--border-color)] px-3 py-1.5 font-body text-xs text-[var(--text-dim)]"
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-heading text-[11px] font-bold uppercase tracking-wide text-[var(--text-dimmer)]">
              Estilo
            </p>
            <div className="flex flex-wrap gap-2">
              {STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStyle(opt.id)}
                  className={
                    style === opt.id
                      ? "rounded-lg border border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] px-3 py-1.5 font-body text-xs font-semibold text-[var(--ui-accent)]"
                      : "rounded-lg border border-[var(--border-color)] px-3 py-1.5 font-body text-xs text-[var(--text-dim)]"
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 p-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
              <p className="font-body text-[11px] leading-relaxed text-[var(--text-dim)]">{error}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="ui-btn-accent inline-flex h-9 items-center justify-center gap-2 px-4 font-heading text-xs font-semibold disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {loading ? (statusLabel ?? "Gerando…") : "Gerar 4 variações"}
          </button>

          {credits ? (
            <p className="flex items-center gap-1.5 font-body text-[11px] text-[var(--text-dimmer)]">
              <Coins size={11} />
              {formatCreditsSummary(credits)}
            </p>
          ) : null}
        </div>

        {insight ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] p-3">
            <Sparkles size={15} className="mt-0.5 shrink-0 text-[var(--ui-accent)]" />
            <p className="font-body text-[11px] leading-relaxed text-[var(--text-dim)]">
              <span className="font-semibold text-[var(--text-main)]">Baseado no que já funcionou:</span>{" "}
              o gancho &quot;{insight.adName}&quot; tem o melhor CTR recente ({insight.ctr.toFixed(2)}%) —
              as variações abaixo levam isso em conta.
            </p>
          </div>
        ) : null}

        {variants ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {variants.map((v, i) => (
              <div key={i} className="campaign-creator-card overflow-hidden">
                <div className={`relative w-full overflow-hidden bg-[var(--ui-accent-muted)] ${ASPECT_CLASS[format]}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:${v.mimeType};base64,${v.imageBase64}`}
                    alt={v.headline}
                    className="h-full w-full object-cover"
                  />
                  {regeneratingIndex === i ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-center">
                      <span className="flex items-center gap-1.5 font-body text-[11px] font-medium text-white">
                        <Loader2 size={13} className="animate-spin" />
                        {statusLabel ?? "Gerando…"}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2 p-3">
                  <input
                    value={v.headline}
                    onChange={(e) => updateVariantText(i, "headline", e.target.value)}
                    className="w-full border-0 bg-transparent p-0 font-heading text-xs font-semibold text-[var(--text-main)] focus:outline-none focus:ring-0"
                    maxLength={90}
                  />
                  <textarea
                    value={v.body}
                    onChange={(e) => updateVariantText(i, "body", e.target.value)}
                    rows={2}
                    maxLength={200}
                    className="w-full resize-none border-0 bg-transparent p-0 font-body text-[11px] leading-relaxed text-[var(--text-dim)] focus:outline-none focus:ring-0"
                  />
                  {usedIndexes.has(i) ? (
                    <div className="flex items-center gap-1.5 font-body text-[11px] font-semibold text-emerald-500">
                      <Check size={13} /> Rascunho pronto no Criador
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => useVariant(i)}
                        disabled={committing !== null || busy}
                        className="ui-btn-accent-outline inline-flex h-7 flex-1 items-center justify-center gap-1.5 font-body text-[11px] font-medium disabled:opacity-60"
                      >
                        <Copy size={12} />
                        {committing === i ? "Enviando…" : "Usar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingIndex(i)}
                        disabled={busy || committing !== null}
                        aria-label="Editar imagem"
                        title="Editar imagem"
                        className="ui-btn-accent-outline inline-flex h-7 w-7 shrink-0 items-center justify-center disabled:opacity-60"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => regenerateOne(i)}
                        disabled={busy || committing !== null}
                        aria-label="Gerar variação parecida"
                        title="Gerar variação parecida"
                        className="ui-btn-accent-outline inline-flex h-7 w-7 shrink-0 items-center justify-center disabled:opacity-60"
                      >
                        <RefreshCw size={12} className={regeneratingIndex === i ? "animate-spin" : ""} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {Array.from({ length: pendingSlots }).map((_, i) => (
              <div key={`pending-${i}`} className="campaign-creator-card overflow-hidden">
                <div className={`flex w-full animate-pulse items-center justify-center bg-[var(--ui-accent-muted)] ${ASPECT_CLASS[format]}`}>
                  <Loader2 size={18} className="animate-spin text-[var(--ui-accent)]" />
                </div>
                <div className="space-y-2 p-3">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--ui-accent-muted)]" />
                  <div className="h-3 w-full animate-pulse rounded bg-[var(--ui-accent-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {usedIndexes.size > 0 ? (
          <div className="campaign-creator-card flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="font-body text-xs text-[var(--text-dim)]">
              {lastDraftId
                ? "Rascunho de campanha criado com essa imagem + copy já aplicadas no anúncio."
                : "A imagem já está na biblioteca de criativos deste cliente."}
            </p>
            <Link
              href={lastDraftId ? `/campaigns/new/${lastDraftId}?active=ad` : "/campaigns/new"}
              className="ui-btn-accent inline-flex h-8 shrink-0 items-center gap-1.5 px-3 font-heading text-xs font-semibold"
            >
              Abrir Criador de Anúncio
              <ExternalLink size={13} />
            </Link>
          </div>
        ) : null}
      </div>

      {editingIndex !== null && variants?.[editingIndex] ? (
        <ImageEditorModal
          open
          imageBase64={variants[editingIndex]!.imageBase64}
          mimeType={variants[editingIndex]!.mimeType}
          initialText={variants[editingIndex]!.headline}
          onClose={() => setEditingIndex(null)}
          onApply={(result) => {
            updateVariantImage(editingIndex, result);
            setEditingIndex(null);
          }}
        />
      ) : null}
    </AppPageShell>
  );
}
