"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeft, Loader2, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { FilterTextField } from "@/components/FilterTextField";
import { mapMetaTargetingToDraft } from "@/lib/meta-adset-import";
import type { DraftTargeting } from "@/lib/campaign-draft";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type SavedAudience = {
  id: string;
  name: string;
  targeting: Record<string, unknown>;
};

function draftTargetingToPersonaPayload(targeting: DraftTargeting, metaTargeting: Record<string, unknown>) {
  const genders =
    targeting.gender === "male" ? [1] : targeting.gender === "female" ? [2] : undefined;
  return {
    ageMin: targeting.ageMin,
    ageMax: targeting.ageMax,
    gender: targeting.gender,
    targeting: {
      ...metaTargeting,
      age_min: targeting.ageMin,
      age_max: targeting.ageMax,
      ...(genders ? { genders } : {})
    }
  };
}

export function PersonaFromExistingUxPage() {
  const t = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");
  const router = useRouter();
  const [clientSlug, setClientSlug] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [personaName, setPersonaName] = useState("");
  const [audiences, setAudiences] = useState<SavedAudience[]>([]);
  const [loadingAudiences, setLoadingAudiences] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          const first = j.clients?.find((c) => c.defaultAdAccountId || c.adAccounts.length > 0);
          if (!first) return;
          setClientSlug(first.slug);
          setAdAccountId(first.defaultAdAccountId ?? first.adAccounts[0]?.metaAdAccountId ?? "");
        }
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientSlug || !adAccountId) {
      setAudiences([]);
      return;
    }
    setLoadingAudiences(true);
    const qs = new URLSearchParams({ clientId: clientSlug, adAccountId });
    fetch(`/api/meta/saved-audiences?${qs}`)
      .then((r) => r.json())
      .then(
        (j: {
          ok?: boolean;
          audiences?: Array<{
            id: string;
            name: string;
            targeting?: Record<string, unknown>;
          }>;
        }) => {
          if (!j.ok) {
            setAudiences([]);
            return;
          }
          setAudiences(
            (j.audiences ?? [])
              .filter((a) => a.targeting && Object.keys(a.targeting).length > 0)
              .map((a) => ({
                id: a.id,
                name: a.name,
                targeting: a.targeting ?? {}
              }))
          );
        }
      )
      .catch(() => setAudiences([]))
      .finally(() => setLoadingAudiences(false));
  }, [clientSlug, adAccountId]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return audiences;
    return audiences.filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
  }, [audiences, filter]);

  const selected = audiences.find((a) => a.id === selectedId) ?? null;

  const handleSelect = useCallback(
    (audience: SavedAudience) => {
      setSelectedId(audience.id);
      if (!personaName.trim()) setPersonaName(audience.name);
    },
    [personaName]
  );

  const handleSave = () => {
    if (!personaName.trim()) {
      setError(t("personaNameRequired"));
      return;
    }
    if (!selected) {
      setError(t("personaExistingSelectRequired"));
      return;
    }
    const draft = mapMetaTargetingToDraft(selected.targeting);
    const payload = draftTargetingToPersonaPayload(draft, selected.targeting);
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/personas", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            adAccountId: adAccountId || undefined,
            name: personaName.trim(),
            description: t("personaExistingSourceDescription"),
            ageMin: payload.ageMin,
            ageMax: payload.ageMax,
            gender: payload.gender,
            targeting: payload.targeting,
            sourcePrompt: t("personaExistingSourceDescription")
          })
        });
        const j = await res.json();
        if (!j.ok) {
          setError(j.error ?? t("savePersonaFailed"));
          return;
        }
        router.push("/audiences/personas");
        router.refresh();
      } catch {
        setError(t("savePersonaFailed"));
      }
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="campaign-creator-header shrink-0 px-4 pb-3 pt-3 lg:pl-8 lg:pr-4 lg:pb-4 lg:pt-4">
        <div className="flex items-start justify-between gap-3">
          <PageTitleBlock
            className="flex-1"
            title={t("personaCreatorTitle")}
            subtitle={
              <>
                <Link href="/audiences/personas" className="hover:underline">
                  {t("personasLibraryTitle")}
                </Link>
                {" › "}
                {t("personaCreateExisting")}
              </>
            }
            titleIcon={<Users size={16} aria-hidden />}
          />
          <button
            type="button"
            onClick={() => router.push("/audiences/personas")}
            aria-label={tCc("close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 lg:h-8 lg:w-8"
          >
            <X size={20} strokeWidth={2} className="text-[var(--text-dim)]" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[1fr] gap-x-8 overflow-hidden px-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:pl-8 lg:pr-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="campaign-creator-main-scroll relative col-start-1 row-start-1 flex min-h-0 min-w-0 w-full flex-col overflow-y-auto py-3">
          <div className="campaign-creator-main-scroll__inner w-full space-y-4 pb-6">
            <div>
              <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                {t("personaCreateExisting")}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-dim)]">{t("personaCreateExistingHint")}</p>
            </div>

            {error ? <div className="ui-alert-danger text-sm">{error}</div> : null}

            <section className="campaign-creator-card space-y-3">
              <FilterTextField
                creatorField
                icon={<Users size={13} />}
                label={t("personaManualName")}
                placeholder={t("personaManualNamePh")}
                value={personaName}
                onChange={setPersonaName}
              />

              {!clientSlug || !adAccountId ? (
                <p className="ui-alert-warning text-xs">{tCc("savedAudiencesNeedAccount")}</p>
              ) : loadingAudiences ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--text-dim)]">
                  <Loader2 size={18} className="animate-spin" />
                  <span>{tCc("savedTargetingLoading")}</span>
                </div>
              ) : audiences.length === 0 ? (
                <p className="rounded-lg border border-[var(--border-color)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-3 py-2 text-xs text-[var(--text-dim)]">
                  {tCc("savedTargetingEmpty")}
                </p>
              ) : (
                <>
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={tCc("savedAudiencesSearch")}
                    className="ui-input w-full text-sm"
                  />
                  <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-1">
                    {filtered.length === 0 ? (
                      <p className="px-2 py-2 text-center text-xs text-[var(--text-dim)]">
                        {tCc("savedAudiencesNoMatch")}
                      </p>
                    ) : (
                      filtered.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => handleSelect(a)}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs transition",
                            selectedId === a.id
                              ? "bg-[var(--ui-accent-muted)]"
                              : "hover:bg-[var(--surface-bg)]"
                          )}
                        >
                          <span
                            className={cn(
                              "h-3.5 w-3.5 shrink-0 rounded-full border-2",
                              selectedId === a.id
                                ? "border-[var(--ui-accent)] bg-[var(--ui-accent)]"
                                : "border-[var(--border-color)]"
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate font-medium text-[var(--text-main)]">
                            {a.name}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </main>

        <aside className="campaign-creator-sidebar hidden min-h-0 lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1" aria-hidden />
            <div className="campaign-creator-sidebar-footer shrink-0">
              <div className="ui-wizard-nav--sidebar">
                <div className="ui-wizard-nav__actions">
                  <button
                    type="button"
                    onClick={() => router.push("/audiences/personas")}
                    className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                    {tCc("back")}
                  </button>
                  <button
                    type="button"
                    disabled={pending || !personaName.trim() || !selected}
                    onClick={handleSave}
                    className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending ? t("zoneSaving") : t("personaSave")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="campaign-creator-footer-outer shrink-0 lg:hidden">
        <div className="campaign-creator-footer-band">
          <div className="ui-wizard-nav--footer">
            <div className="ui-wizard-nav__actions">
              <button
                type="button"
                onClick={() => router.push("/audiences/personas")}
                className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
                {tCc("back")}
              </button>
              <button
                type="button"
                disabled={pending || !personaName.trim() || !selected}
                onClick={handleSave}
                className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? t("zoneSaving") : t("personaSave")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
