"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Plus, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { PersonaCreateModeSheet } from "@/components/audiences/PersonaCreateModeSheet";
import { PersonaDetailPanel, formatPersonaGender } from "@/components/audiences/PersonaDetailPanel";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { DsInfoBanner } from "@/design-system";
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
};

type Props = {
  clientSlug?: string;
  adAccountId?: string;
};

export function PersonasLibraryClient({ clientSlug: clientSlugProp, adAccountId: adAccountIdProp }: Props) {
  const t = useTranslations("audiences");
  const tm = useTranslations("audiencesMisc");
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<PersonaSummary | null>(null);
  const [clientSlug, setClientSlug] = useState(clientSlugProp ?? "");
  const [adAccountId, setAdAccountId] = useState(adAccountIdProp ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (clientSlugProp && adAccountIdProp) {
      setClientSlug(clientSlugProp);
      setAdAccountId(adAccountIdProp);
      return;
    }
    fetch("/api/audiences/hub")
      .then((r) => r.json())
      .then(
        (j: {
          clients?: Array<{
            slug: string;
            defaultAdAccountId: string | null;
            adAccounts: { metaAdAccountId: string }[];
          }>;
        }) => {
          const first = j.clients?.find(
            (c) => c.defaultAdAccountId || c.adAccounts.length > 0
          );
          if (!first) return;
          setClientSlug(first.slug);
          setAdAccountId(
            first.defaultAdAccountId ?? first.adAccounts[0]?.metaAdAccountId ?? ""
          );
        }
      )
      .catch(() => {});
  }, [clientSlugProp, adAccountIdProp]);

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

      <DsInfoBanner className="px-4 py-2.5 text-sm">{t("personasLibraryAureumAlert")}</DsInfoBanner>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <div className="dashboard-kpi-card flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center !min-h-0">
          <p className="text-sm text-[var(--text-dim)]">{t("loadingPersonas")}</p>
        </div>
      ) : personas.length === 0 ? (
        <div className="dashboard-kpi-card flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center !min-h-0">
          <Users size={32} className="text-[var(--text-dimmer)]" aria-hidden />
          <p className="text-sm text-[var(--text-dim)]">{t("noPersonasYet")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((p) => (
            <article key={p.id} className="campaign-creator-card flex flex-col gap-2 p-4">
              <h3 className="font-heading text-[var(--text-main)]">{p.name}</h3>
              {p.description ? (
                <p className="line-clamp-3 text-sm text-[var(--text-dim)]">{p.description}</p>
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
