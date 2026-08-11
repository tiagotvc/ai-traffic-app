"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { FilterSearchInput } from "@/components/FilterSearchInput";
import { cn } from "@/lib/cn";

// O escopo segue resolvido pelo provider (usado pelo painel de detalhe para
// sugerir segmentos), mas a barra não é exibida aqui: a biblioteca de personas
// é global do workspace e um seletor de cliente daria a entender que filtra.
import { useAudienceScope } from "@/components/audiences/AudienceScopeContext";
import { PersonaCreateModeSheet } from "@/components/audiences/PersonaCreateModeSheet";
import { PersonaDetailPanel, formatPersonaGender } from "@/components/audiences/PersonaDetailPanel";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { useRouter } from "@/i18n/navigation";

export type PersonaSummary = {
  id: string;
  name: string;
  description: string | null;
  ageMin: number;
  ageMax: number;
  gender: string;
  targeting: Record<string, unknown>;
  sourcePrompt: string | null;
  updatedAt: string;
  tags?: string[];
};

export function PersonasLibraryClient() {
  const t = useTranslations("audiences");
  const tm = useTranslations("audiencesMisc");
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaSummary | null>(null);
  const { clientSlug, adAccountId } = useAudienceScope();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  /** Tags existentes na biblioteca, ordenadas por uso — alimenta filtro e autocomplete. */
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of personas) {
      for (const tag of p.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [personas]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return personas.filter((p) => {
      // Múltiplas tags = E, não OU: filtrar por "beleza" + "dawson" deve
      // devolver só o que tem as duas, senão o filtro não estreita nada.
      if (activeTags.length && !activeTags.every((tag) => (p.tags ?? []).includes(tag))) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.tags ?? []).some((tag) => tag.includes(q))
      );
    });
  }, [personas, search, activeTags]);

  const toggleTag = (tag: string) =>
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag]));

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/personas")
      .then((r) => r.json())
      .then((j: { ok?: boolean; personas?: PersonaSummary[]; error?: string }) => {
        if (!j.ok) {
          setError(j.error ?? tm("errorLoadingPersonas"));
          setPersonas([]);
          return;
        }
        setPersonas(j.personas ?? []);
        setError(null);
      })
      .catch(() => setError(tm("errorLoadingPersonas")))
      .finally(() => setLoading(false));
  }, [tm]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitleBlock
          title={t("personasLibraryTitle")}
          subtitle={t("personasLibrarySubtitle")}
          titleIcon={<Users size={16} aria-hidden />}
          badge={
            <span
              className="rounded-full px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wide"
              style={{
                background: "var(--ui-accent-muted)",
                color: "var(--ui-accent)",
                border: "1px solid var(--ui-accent-border)"
              }}
            >
              {t("personasLibraryBadge")}
            </span>
          }
        />
        <button
          type="button"
          className="ui-btn-accent inline-flex items-center gap-2 px-5 py-2.5 font-heading text-sm font-semibold"
          onClick={() => setShowCreateMode(true)}
        >
          <Plus size={16} />
          {t("newPersona")}
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && personas.length > 0 ? (
        <div className="flex flex-col gap-2">
          <FilterSearchInput
            creatorField
            size="wide"
            className="mt-0 h-9 w-full max-w-sm"
            label={t("searchPersonas")}
            value={search}
            onChange={setSearch}
            placeholder={t("searchPersonas")}
          />
          {tagCounts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTags([])}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                  activeTags.length === 0
                    ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                    : "border-[var(--border-color)] text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                )}
              >
                {t("tagFilterAll")}
              </button>
              {tagCounts.map(({ tag, count }) => {
                const active = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                      active
                        ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"
                        : "border-[var(--border-color)] text-[var(--text-dim)] hover:bg-[var(--surface-bg)]"
                    )}
                  >
                    #{tag} <span className="text-[var(--text-dimmer)]">{count}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="dashboard-kpi-card flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center !min-h-0">
          <p className="text-sm text-[var(--text-dim)]">{t("loadingPersonas")}</p>
        </div>
      ) : personas.length === 0 ? (
        <div className="dashboard-kpi-card flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center !min-h-0">
          <Users size={32} className="text-[var(--text-dimmer)]" aria-hidden />
          <p className="text-sm text-[var(--text-dim)]">{t("noPersonasYet")}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="dashboard-kpi-card flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center !min-h-0">
          <Users size={32} className="text-[var(--text-dimmer)]" aria-hidden />
          <p className="text-sm text-[var(--text-dim)]">{t("noPersonasMatch")}</p>
          <button
            type="button"
            className="ui-btn-secondary text-xs"
            onClick={() => {
              setActiveTags([]);
              setSearch("");
            }}
          >
            {t("tagFilterClear")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <article key={p.id} className="campaign-creator-card flex flex-col gap-2 p-4">
              <h3 className="font-heading text-[var(--text-main)]">{p.name}</h3>
              {p.description ? (
                <p className="line-clamp-3 text-sm text-[var(--text-dim)]">{p.description}</p>
              ) : null}
              {p.tags?.length ? (
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--ui-accent)] transition hover:opacity-80"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : null}
              <p className="text-xs text-[var(--text-dimmer)]">
                {p.ageMin}–{p.ageMax} · {formatPersonaGender(p.gender, t)}
              </p>
              <button
                type="button"
                className="ui-btn-secondary mt-auto w-full text-xs"
                onClick={() => setSelectedPersona(p)}
              >
                {t("viewPersona")}
              </button>
            </article>
          ))}
        </div>
      )}

      <PersonaCreateModeSheet
        open={showCreateMode}
        onClose={() => setShowCreateMode(false)}
        onSelectManual={() => router.push("/audiences/personas/create?mode=manual")}
        onSelectAi={() => router.push("/audiences/personas/create?mode=ai")}
        onSelectExisting={() => router.push("/audiences/personas/create?mode=existing")}
      />

      {selectedPersona ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="campaign-creator-card max-h-[90vh] w-full max-w-2xl overflow-hidden p-0">
            <div className="max-h-[90vh] overflow-y-auto p-5">
              <PersonaDetailPanel
                persona={selectedPersona}
                clientSlug={clientSlug}
                adAccountId={adAccountId}
                onClose={() => setSelectedPersona(null)}
                onUpdated={(updated) => {
                  setPersonas((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                  setSelectedPersona(updated);
                }}
                onDeleted={(id) => {
                  setPersonas((prev) => prev.filter((p) => p.id !== id));
                  setSelectedPersona(null);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
