"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Facebook,
  Globe,
  Instagram,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  X
} from "lucide-react";

import { TosBanner } from "@/components/audiences/create/TosBanner";
import { AudienceCreatorBrainTips } from "@/components/audiences/create/AudienceCreatorBrainTips";
import { AudienceCreatorSidebarProgressCard } from "@/components/audiences/create/AudienceCreatorSidebarProgressCard";
import { AudienceCreatorSummaryModal } from "@/components/audiences/create/AudienceCreatorSummaryModal";
import type { AudienceCreateContext, AudienceOptions } from "@/components/audiences/create/types";
import {
  ChoiceCardCheck,
  MultiSelectChoiceCard
} from "@/components/campaign-creator/BudgetChoiceCard";
import { FilterTextField } from "@/components/FilterTextField";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { UxHorizontalStepper } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

type AudienceStepKey = "setup" | "rules" | "review";
type AudienceTypeChoice = "custom" | "lookalike" | "saved" | "";
type GenderKey = "male" | "female" | "all";

const STEP_ORDER: AudienceStepKey[] = ["setup", "rules", "review"];

type HubClient = { slug: string; name: string };

type Props = {
  ctx: AudienceCreateContext;
  clients: HubClient[];
  clientSlug: string;
  onClientChange: (slug: string) => void;
  onBack: () => void;
  bareShell?: boolean;
};

function AudienceChoiceRow({
  selected,
  label,
  description,
  icon: Icon,
  onSelect
}: {
  selected: boolean;
  label: string;
  description?: string;
  icon?: LucideIcon;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row campaign-creator-budget-choice-card--row-lg w-full",
        selected
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <ChoiceCardCheck selected={selected} />
      {Icon ? (
        <span
          className={cn(
            "campaign-creator-budget-choice-card__icon campaign-creator-budget-choice-card__icon--inline",
            selected
              ? "campaign-creator-budget-choice-card__icon--selected"
              : "campaign-creator-budget-choice-card__icon--unselected"
          )}
          aria-hidden
        >
          <Icon size={20} strokeWidth={1.75} />
        </span>
      ) : null}
      <span className="campaign-creator-budget-choice-card__content">
        <span className="campaign-creator-budget-choice-card__title-row">
          <span className="campaign-creator-budget-choice-card__label campaign-creator-budget-choice-card__label--inline">
            {label}
          </span>
        </span>
        {description ? (
          <span className="campaign-creator-budget-choice-card__description">{description}</span>
        ) : null}
      </span>
    </button>
  );
}

function ruleActionIcon(source: string, metaEvent: string): LucideIcon {
  const event = metaEvent.toUpperCase();
  if (event.includes("LEAD")) return Tag;
  if (source === "instagram") return Instagram;
  if (source === "facebook") return Facebook;
  return Activity;
}

function AudienceReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="campaign-creator-review-overview-row">
      <div className="min-w-0 flex-1">
        <p className="campaign-creator-review-summary-row__label">{label}</p>
        <div className="campaign-creator-review-summary-row__value">{value}</div>
      </div>
    </div>
  );
}

function AudienceWizardNav({
  onBack,
  onNext,
  onCreate,
  showNext,
  showCreate,
  nextDisabled,
  createDisabled,
  createPending,
  backLabel,
  nextLabel,
  createLabel,
  creatingLabel,
  placement
}: {
  onBack: () => void;
  onNext: () => void;
  onCreate: () => void;
  showNext: boolean;
  showCreate: boolean;
  nextDisabled: boolean;
  createDisabled: boolean;
  createPending: boolean;
  backLabel: string;
  nextLabel: string;
  createLabel: string;
  creatingLabel: string;
  placement: "sidebar" | "footer";
}) {
  const wrapperClass = placement === "sidebar" ? "ui-wizard-nav--sidebar" : "ui-wizard-nav--footer";

  return (
    <div className={wrapperClass}>
      <div className="ui-wizard-nav__actions">
        <button
          type="button"
          onClick={onBack}
          className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
          {backLabel}
        </button>
        {showNext ? (
          <button
            type="button"
            disabled={nextDisabled}
            onClick={onNext}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nextLabel}
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        ) : showCreate ? (
          <button
            type="button"
            disabled={createDisabled || createPending}
            onClick={onCreate}
            className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserCheck size={14} />
            {createPending ? creatingLabel : createLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CreatorNumberField({
  label,
  value,
  onChange,
  min,
  max
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-body text-xs text-[var(--text-dim)]">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-3 font-body text-sm text-[var(--text-main)] outline-none transition-all focus:border-[var(--ui-accent)]"
      />
    </div>
  );
}

export function AudienceCreatorUxPage({ ctx, onBack, bareShell }: Props) {
  const t = useTranslations("audiences");
  const tAc = useTranslations("audienceCreator");
  const tCc = useTranslations("campaignCreator");
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<AudienceStepKey>("setup");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [typeChoice, setTypeChoice] = useState<AudienceTypeChoice>("");
  const [audienceName, setAudienceName] = useState("");
  const [source, setSource] = useState("instagram");
  const [window_, setWindow_] = useState("30");
  const [country, setCountry] = useState("BR");
  const [lookalikePct, setLookalikePct] = useState("1");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [genders, setGenders] = useState<GenderKey[]>(["male", "female"]);
  const [interests, setInterests] = useState("");
  const [ruleAction, setRuleAction] = useState("");
  const [seedAudienceId, setSeedAudienceId] = useState("");
  const [options, setOptions] = useState<AudienceOptions | null>(null);
  const [tosBlocked, setTosBlocked] = useState(false);

  const currentIdx = STEP_ORDER.indexOf(step);

  const seedAudiences = useMemo(
    () => ctx.audiences.filter((a) => !(a.subtype ?? "").toUpperCase().includes("LOOKALIKE")),
    [ctx.audiences]
  );

  useEffect(() => {
    if (typeChoice !== "custom") return;
    // Guarda contra corrida: só a resposta da requisição mais recente vale.
    // (Pixel/website é mais lento; sem isso, uma resposta antiga sobrescrevia a boa
    // e a lista de ações sumia, travando em "Carregando opções da Meta".)
    let active = true;
    const controller = new AbortController();
    const qs = new URLSearchParams({
      clientId: ctx.clientSlug,
      adAccountId: ctx.adAccountId,
      type: source === "site" ? "website" : "engagement"
    });
    fetch(`/api/meta/audience-creation/options?${qs}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => {
        if (active && j.ok) setOptions(j as AudienceOptions);
      })
      .catch(() => {});
    return () => {
      active = false;
      controller.abort();
    };
  }, [ctx.clientSlug, ctx.adAccountId, typeChoice, source]);

  useEffect(() => {
    if (seedAudiences.length && !seedAudienceId) {
      setSeedAudienceId(seedAudiences[0]?.id ?? "");
    }
  }, [seedAudiences, seedAudienceId]);

  // Rule actions are specific to the selected source: pixel/site events vs.
  // Instagram engagement vs. Facebook Page engagement. The catalogs come from
  // the audience-creation options endpoint, so the list always matches Meta.
  const ruleActionOptions = useMemo(() => {
    if (source === "site") {
      return (options?.websiteEvents ?? []).map((e) => ({
        value: e.metaEvent,
        label: e.isCustom ? e.labelKey : t(e.labelKey as "websiteEvent.pageView")
      }));
    }
    const sourceKey = source === "instagram" ? "ig_business" : "page";
    return (options?.engagementActions?.[sourceKey] ?? []).map((a) => ({
      value: a.metaEvent,
      label: t(a.labelKey as "engagementAction.pageEngaged")
    }));
  }, [source, options, t]);

  // Keep the selected action valid when the source changes or options load.
  useEffect(() => {
    if (!ruleActionOptions.length) return;
    if (!ruleActionOptions.some((o) => o.value === ruleAction)) {
      setRuleAction(ruleActionOptions[0]!.value);
    }
  }, [ruleActionOptions, ruleAction]);

  const ruleActionLabel =
    ruleActionOptions.find((o) => o.value === ruleAction)?.label ?? ruleAction;

  const sourceLabel = source === "site" ? "Site (Pixel)" : source === "instagram" ? "Instagram" : "Facebook";

  useEffect(() => {
    if (bareShell) return;
    const shell = document.querySelector<HTMLElement>("[data-campaign-creator-shell]")?.closest("main");
    if (!shell) return;
    const prevOverflow = shell.style.overflow;
    const prevDisplay = shell.style.display;
    const prevFlexDirection = shell.style.flexDirection;
    shell.style.overflow = "hidden";
    shell.style.display = "flex";
    shell.style.flexDirection = "column";
    return () => {
      shell.style.overflow = prevOverflow;
      shell.style.display = prevDisplay;
      shell.style.flexDirection = prevFlexDirection;
    };
  }, [bareShell]);

  const typeLabel =
    typeChoice === "custom"
      ? tAc("typePersonalizado")
      : typeChoice === "lookalike"
        ? tAc("typeLookalike")
        : typeChoice === "saved"
          ? tAc("typeSalvo")
          : "—";

  const genderOptions: { key: GenderKey; label: string }[] = [
    { key: "male", label: tAc("genderMale") },
    { key: "female", label: tAc("genderFemale") },
    { key: "all", label: tAc("genderAll") }
  ];

  const gendersReviewLabel = genders
    .map((g) => genderOptions.find((o) => o.key === g)?.label ?? g)
    .join(", ");

  const canNext =
    step === "setup"
      ? typeChoice !== "" && audienceName.trim() !== ""
      : true;

  const goNext = () => {
    if (step === "setup" && audienceName.trim() === "") {
      setNameTouched(true);
      return;
    }
    const next = STEP_ORDER[currentIdx + 1];
    if (next) setStep(next);
  };

  const goPrev = () => {
    if (currentIdx === 0) {
      onBack();
      return;
    }
    setStep(STEP_ORDER[currentIdx - 1]!);
  };

  const toggleGender = (g: GenderKey) =>
    setGenders((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const scoreItems = [
    { labelKey: "scoreAudienceType" as const, done: typeChoice !== "" },
    { labelKey: "scoreAudienceName" as const, done: audienceName.trim() !== "" },
    { labelKey: "scoreCountryRegion" as const, done: country !== "" },
    { labelKey: "scoreSourceRules" as const, done: step === "rules" || step === "review" }
  ];
  const score = Math.round((scoreItems.filter((s) => s.done).length / scoreItems.length) * 100);
  const stepPercent = Math.round(((currentIdx + 1) / STEP_ORDER.length) * 100);

  const selectedSeed = seedAudiences.find((a) => a.id === seedAudienceId);

  const handleCreate = useCallback(() => {
    startTransition(async () => {
      try {
        if (typeChoice === "custom") {
          if (source === "site") {
            const pixelId = options?.pixels?.[0]?.id;
            if (!pixelId) {
              ctx.onError(t("noPixels"));
              return;
            }
            const res = await fetch("/api/meta/audiences/website", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                clientId: ctx.clientSlug,
                adAccountId: ctx.adAccountId,
                name: audienceName.trim(),
                pixelId,
                eventName: ruleAction || "PageView",
                retentionDays: Math.min(parseInt(window_, 10) || 30, 180)
              })
            });
            const j = await res.json();
            if (!j.ok) {
              ctx.onError(j.error ?? t("createdFailed"));
              return;
            }
          } else {
            const sourceType = source === "instagram" ? "ig_business" : "page";
            const eventName =
              ruleAction || (sourceType === "ig_business" ? "ig_business_profile_engaged" : "page_engaged");
            const list =
              sourceType === "ig_business" ? options?.instagramAccounts : options?.pages;
            const sourceId = list?.[0]?.id;
            if (!sourceId) {
              ctx.onError(t("selectSourceAsset"));
              return;
            }
            const res = await fetch("/api/meta/audiences/engagement", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                clientId: ctx.clientSlug,
                adAccountId: ctx.adAccountId,
                name: audienceName.trim(),
                sourceType,
                sourceIds: [sourceId],
                eventName,
                retentionDays: parseInt(window_, 10) || 30
              })
            });
            const j = await res.json();
            if (!j.ok) {
              ctx.onError(j.error ?? t("createdFailed"));
              return;
            }
          }
          ctx.onSuccess(t("engagementCreated"));
        } else if (typeChoice === "lookalike") {
          if (!seedAudienceId) {
            ctx.onError(t("lookalikeSelectRequired"));
            return;
          }
          const ratio = parseInt(lookalikePct, 10) / 100;
          const res = await fetch(`/api/clients/${encodeURIComponent(ctx.clientSlug)}/lookalike/batch`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              adAccountId: ctx.adAccountId,
              items: [
                {
                  originAudienceId: seedAudienceId,
                  ratio,
                  country,
                  name: audienceName.trim() || `LA ${lookalikePct}% — ${selectedSeed?.name ?? seedAudienceId} — ${country}`
                }
              ]
            })
          });
          const j = await res.json();
          if (!j.ok && !(j.summary?.succeeded > 0)) {
            ctx.onError(j.error ?? t("createdFailed"));
            return;
          }
          ctx.onSuccess(t("lookalikeBatchSuccess", { count: j.summary?.succeeded ?? 1 }));
        } else if (typeChoice === "saved") {
          const targeting: Record<string, unknown> = {
            geo_locations: { countries: [country] },
            age_min: parseInt(ageMin, 10) || 18,
            age_max: parseInt(ageMax, 10) || 65
          };
          if (genders.length === 1 && genders.includes("male")) targeting.genders = [1];
          else if (genders.length === 1 && genders.includes("female")) targeting.genders = [2];
          const res = await fetch("/api/meta/saved-audiences", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              clientId: ctx.clientSlug,
              adAccountId: ctx.adAccountId,
              name: audienceName.trim(),
              targeting
            })
          });
          const j = await res.json();
          if (!j.ok) {
            ctx.onError(j.error ?? t("createdFailed"));
            return;
          }
          ctx.onSuccess(t("savedAudienceCreated"));
        }
        ctx.onRefresh();
        onBack();
      } catch (e) {
        ctx.onError(e instanceof Error ? e.message : t("createdFailed"));
      }
    });
  }, [
    ageMax,
    ageMin,
    audienceName,
    country,
    ctx,
    genders,
    lookalikePct,
    onBack,
    options,
    ruleAction,
    seedAudienceId,
    selectedSeed?.name,
    source,
    t,
    typeChoice,
    window_
  ]);

  const stepperSteps = [
    { number: 1, label: tAc("macroStepSetup"), disabled: currentIdx < 0 },
    { number: 2, label: tAc("macroStepRules"), disabled: currentIdx < 1 },
    { number: 3, label: tAc("macroStepReview"), disabled: currentIdx < 2 }
  ];

  const shellClass = bareShell
    ? "flex min-h-0 flex-1 flex-col overflow-hidden"
    : "app-shell-breakout flex min-h-0 flex-1 flex-col overflow-hidden";

  return (
    <div
      {...(bareShell ? {} : { "data-campaign-creator-shell": true })}
      className={shellClass}
      style={{ background: "var(--surface-bg)" }}
    >
      <OrionTrafficLoadingOverlay
        open={pending}
        title={tAc("createAudience")}
        message={t("creating")}
        ariaLabelledBy="audience-create-loading-title"
      />

      <header className="campaign-creator-header shrink-0 px-4 pb-3 pt-3 lg:pl-8 lg:pr-4 lg:pb-4 lg:pt-4">
        <div className="flex items-start justify-between gap-3">
          <PageTitleBlock
            className="flex-1"
            title={tAc("pageTitle")}
            subtitle={
              <>
                <Link href="/audiences/meta" className="hover:underline">
                  {tAc("breadcrumbAudiences")}
                </Link>
                {" › "}
                {tAc("breadcrumbCreateNew")}
              </>
            }
            titleIcon={<Users size={16} aria-hidden />}
            badge={
              <span
                className="rounded-full px-2.5 py-0.5 font-heading text-[11px] font-semibold lg:text-xs"
                style={{
                  background: "var(--ui-accent-muted)",
                  color: "var(--ui-accent)",
                  border: "1px solid var(--ui-accent-border)"
                }}
              >
                {tAc("draftBadge")}
              </span>
            }
          />
          <button
            type="button"
            onClick={onBack}
            aria-label={tCc("close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 lg:h-8 lg:w-8"
          >
            <X size={20} strokeWidth={2} className="text-[var(--text-dim)]" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr] gap-x-8 overflow-x-visible overflow-y-hidden px-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:pl-8 lg:pr-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="campaign-creator-stepper-row col-start-1 row-start-1 flex shrink-0 items-center gap-3 border-b border-[var(--border-color)] py-2 lg:gap-4 lg:py-1.5">
          <div className="min-w-0 flex-1 overflow-x-auto px-4">
            <div className="campaign-creator-stepper w-full max-w-full lg:w-fit">
              <UxHorizontalStepper
                size="mini"
                steps={stepperSteps}
                current={currentIdx + 1}
                onStepClick={(n) => {
                  if (currentIdx >= n - 1) setStep(STEP_ORDER[n - 1]!);
                }}
              />
            </div>
          </div>
        </div>

        <main className="relative col-start-1 row-start-2 flex min-h-0 min-w-0 w-full flex-col overflow-x-visible overflow-y-hidden py-3">
          <div className="campaign-creator-main-scroll flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-x-visible overflow-y-auto lg:overflow-y-hidden">
            <div className="campaign-creator-main-scroll__inner flex min-h-0 min-w-0 w-full flex-1 flex-col">
              <div className="campaign-creator-step-panel flex min-h-0 min-w-0 w-full flex-1 flex-col">
                <div className="campaign-creator-step-scroll min-h-0 flex-1 overflow-y-auto pb-2 pt-0">
                  <div className="campaign-creator-section-stack space-y-4">
              <TosBanner
                clientSlug={ctx.clientSlug}
                adAccountId={ctx.adAccountId}
                onBlocked={setTosBlocked}
              />

              {step === "setup" ? (
                <div className="animate-fade-up space-y-4">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                      {tAc("setupTitle")}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">{tAc("setupDesc")}</p>
                  </div>

                  <section className="campaign-creator-card">
                    <h3 className="campaign-creator-section-title mb-3">{tAc("audienceType")}</h3>
                    <div className="space-y-2">
                      {[
                        {
                          id: "custom" as AudienceTypeChoice,
                          label: tAc("customAudience"),
                          desc: tAc("customAudienceDesc"),
                          icon: Users
                        },
                        {
                          id: "lookalike" as AudienceTypeChoice,
                          label: tAc("lookalike"),
                          desc: tAc("lookalikeDesc"),
                          icon: Copy
                        },
                        {
                          id: "saved" as AudienceTypeChoice,
                          label: tAc("savedAudience"),
                          desc: tAc("savedAudienceDesc"),
                          icon: Globe
                        }
                      ].map((opt) => (
                        <AudienceChoiceRow
                          key={opt.id}
                          selected={typeChoice === opt.id}
                          label={opt.label}
                          description={opt.desc}
                          icon={opt.icon}
                          onSelect={() => setTypeChoice(opt.id)}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="campaign-creator-card">
                    <FilterTextField
                      creatorField
                      icon={<Tag size={13} />}
                      label={tAc("audienceName")}
                      placeholder={tAc("audienceNamePlaceholder")}
                      value={audienceName}
                      onChange={(v) => {
                        setAudienceName(v);
                        setNameTouched(true);
                      }}
                    />
                    {nameTouched && !audienceName.trim() ? (
                      <p className="mt-2 text-xs text-red-600">{tAc("nameRequired")}</p>
                    ) : null}
                  </section>

                  <section className="campaign-creator-card space-y-3">
                    <h3 className="campaign-creator-section-title">{tAc("countryRegion")}</h3>
                    <div className="flex flex-wrap gap-2.5">
                      {["BR", "PT", "US", "ES", "AR", "MX"].map((c) => (
                        <MultiSelectChoiceCard
                          key={c}
                          selected={country === c}
                          label={c}
                          onToggle={() => setCountry(c)}
                        />
                      ))}
                    </div>
                  </section>

                  {typeChoice === "custom" ? (
                    <section className="campaign-creator-card space-y-3">
                      <h3 className="campaign-creator-section-title">{tAc("dataSource")}</h3>
                      <div className="flex flex-wrap gap-2.5">
                        <MultiSelectChoiceCard
                          selected={source === "instagram"}
                          label="Instagram"
                          icon={Instagram}
                          iconInline
                          onToggle={() => setSource("instagram")}
                        />
                        <MultiSelectChoiceCard
                          selected={source === "facebook"}
                          label="Facebook"
                          icon={Facebook}
                          iconInline
                          onToggle={() => setSource("facebook")}
                        />
                        <MultiSelectChoiceCard
                          selected={source === "site"}
                          label={tAc("sourceSitePixel")}
                          icon={Globe}
                          iconInline
                          onToggle={() => setSource("site")}
                        />
                      </div>
                    </section>
                  ) : null}

                  {typeChoice === "lookalike" ? (
                    <section className="campaign-creator-card space-y-3">
                      <h3 className="campaign-creator-section-title">{tAc("similarityPercentage")}</h3>
                      <div className="flex flex-wrap gap-2.5">
                        {["1", "2", "3", "5", "10"].map((p) => (
                          <MultiSelectChoiceCard
                            key={p}
                            selected={lookalikePct === p}
                            label={`${p}%`}
                            onToggle={() => setLookalikePct(p)}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {typeChoice === "saved" ? (
                    <section className="campaign-creator-card space-y-4">
                      <div>
                        <h3 className="campaign-creator-section-title">{tAc("ageRange")}</h3>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <CreatorNumberField
                            label={tAc("minAge")}
                            value={ageMin}
                            onChange={setAgeMin}
                            min={13}
                            max={65}
                          />
                          <CreatorNumberField
                            label={tAc("maxAge")}
                            value={ageMax}
                            onChange={setAgeMax}
                            min={13}
                            max={65}
                          />
                        </div>
                      </div>
                      <div>
                        <h3 className="campaign-creator-section-title">{tAc("genders")}</h3>
                        <div className="mt-3 flex flex-wrap gap-2.5">
                          {genderOptions.map((g) => (
                            <MultiSelectChoiceCard
                              key={g.key}
                              selected={genders.includes(g.key)}
                              label={g.label}
                              onToggle={() => toggleGender(g.key)}
                            />
                          ))}
                        </div>
                      </div>
                    </section>
                  ) : null}
                </div>
              ) : null}

              {step === "rules" ? (
                <div className="animate-fade-up space-y-4">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                      {tAc("audienceRules")}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">{tAc("audienceRulesDesc")}</p>
                  </div>

                  {typeChoice === "custom" ? (
                    <>
                      <section className="campaign-creator-card space-y-2">
                        <h3 className="campaign-creator-section-title">
                          {tAc("engagementActionFor", { source: sourceLabel })}
                        </h3>
                        {ruleActionOptions.length ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {ruleActionOptions.map((opt) => (
                              <AudienceChoiceRow
                                key={opt.value}
                                selected={ruleAction === opt.value}
                                label={opt.label}
                                icon={ruleActionIcon(source, opt.value)}
                                onSelect={() => setRuleAction(opt.value)}
                              />
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[var(--text-dim)]">{t("loadingOptions")}</p>
                        )}
                      </section>

                      <section className="campaign-creator-card space-y-3">
                        <h3 className="campaign-creator-section-title">{tAc("timeWindow")}</h3>
                        <div className="flex flex-wrap gap-2.5">
                          {["7", "14", "30", "60", "90", "180"].map((d) => (
                            <MultiSelectChoiceCard
                              key={d}
                              selected={window_ === d}
                              label={`${d}D`}
                              onToggle={() => setWindow_(d)}
                            />
                          ))}
                        </div>
                      </section>
                    </>
                  ) : null}

                  {typeChoice === "lookalike" ? (
                    <section className="campaign-creator-card space-y-2">
                      <h3 className="campaign-creator-section-title">{tAc("seedAudience")}</h3>
                      {seedAudiences.length ? (
                        seedAudiences.map((aud) => (
                          <AudienceChoiceRow
                            key={aud.id}
                            selected={seedAudienceId === aud.id}
                            label={aud.name}
                            onSelect={() => setSeedAudienceId(aud.id)}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-[var(--text-dim)]">{t("noAudiences")}</p>
                      )}
                    </section>
                  ) : null}

                  {typeChoice === "saved" ? (
                    <section className="campaign-creator-card">
                      <h3 className="campaign-creator-section-title mb-3">{tAc("interestsBehaviors")}</h3>
                      <FilterTextField
                        creatorField
                        icon={<Activity size={13} />}
                        label={tAc("interestsBehaviors")}
                        placeholder={tAc("interestsPlaceholder")}
                        value={interests}
                        onChange={setInterests}
                      />
                    </section>
                  ) : null}

                  <div
                    className="flex items-start gap-3 rounded-xl border px-4 py-3 text-xs"
                    style={{
                      background: "var(--ui-accent-hover)",
                      borderColor: "var(--ui-accent-border)",
                      color: "var(--text-dim)"
                    }}
                  >
                    <Sparkles size={15} className="mt-0.5 shrink-0 text-[var(--ui-accent)]" aria-hidden />
                    <p>
                      {tAc.rich("processingHint", {
                        emphasis: (chunks) => (
                          <strong className="font-semibold text-[var(--ui-accent)]">{chunks}</strong>
                        )
                      })}
                    </p>
                  </div>
                </div>
              ) : null}

              {step === "review" ? (
                <div className="animate-fade-up space-y-4">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">{tAc("review")}</h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">{tAc("reviewDesc")}</p>
                  </div>

                  <section className="campaign-creator-card">
                    <h3 className="campaign-creator-orion-section-label mb-3">{tAc("audienceSummary")}</h3>
                    <div className="campaign-creator-sidebar-card-inset campaign-creator-summary-section-card space-y-1 p-1">
                      <AudienceReviewRow label={tAc("reviewType")} value={typeLabel} />
                      <AudienceReviewRow label={tAc("reviewName")} value={audienceName || "—"} />
                      <AudienceReviewRow label={tAc("reviewClient")} value={ctx.clientName} />
                      <AudienceReviewRow label={tAc("reviewCountry")} value={country} />
                      {typeChoice === "custom" ? (
                        <>
                          <AudienceReviewRow label={tAc("reviewSource")} value={sourceLabel} />
                          <AudienceReviewRow label={tAc("reviewAction")} value={ruleActionLabel} />
                          <AudienceReviewRow
                            label={tAc("reviewWindow")}
                            value={tAc("daysValue", { count: parseInt(window_, 10) || 0 })}
                          />
                        </>
                      ) : null}
                      {typeChoice === "lookalike" ? (
                        <>
                          <AudienceReviewRow label={tAc("reviewSimilarity")} value={`${lookalikePct}%`} />
                          <AudienceReviewRow label={tAc("reviewSeedAudience")} value={selectedSeed?.name ?? "—"} />
                        </>
                      ) : null}
                      {typeChoice === "saved" ? (
                        <>
                          <AudienceReviewRow
                            label={tAc("reviewAgeRange")}
                            value={tAc("ageRangeValue", { min: ageMin, max: ageMax })}
                          />
                          <AudienceReviewRow label={tAc("reviewGenders")} value={gendersReviewLabel || "—"} />
                          {interests ? (
                            <AudienceReviewRow label={tAc("reviewInterests")} value={interests} />
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </section>

                  <div className="ui-alert-success flex items-start gap-3 text-xs">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden />
                    <p>
                      {tAc.rich("readyHint", {
                        client: ctx.clientName,
                        emphasis: (chunks) => (
                          <strong className="font-semibold text-[var(--text-main)]">{chunks}</strong>
                        )
                      })}
                    </p>
                  </div>
                </div>
              ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="campaign-creator-sidebar hidden min-h-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col lg:overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="campaign-creator-sidebar__scroll min-h-0 flex-1 overflow-y-auto">
              <div className="campaign-creator-sidebar__inner space-y-3 py-1">
                <AudienceCreatorSidebarProgressCard
                  score={score}
                  scoreItems={scoreItems}
                  stepPercent={stepPercent}
                  onOpenSummary={() => setSummaryOpen(true)}
                />

                <AudienceCreatorBrainTips
                  step={step}
                  typeChoice={typeChoice}
                  score={score}
                  scoreItems={scoreItems}
                />
              </div>
            </div>
            <div className="campaign-creator-sidebar-footer shrink-0">
              <AudienceWizardNav
                placement="sidebar"
                onBack={goPrev}
                onNext={goNext}
                onCreate={handleCreate}
                showNext={step !== "review"}
                showCreate={step === "review"}
                nextDisabled={!canNext}
                createDisabled={tosBlocked}
                createPending={pending}
                backLabel={tCc("back")}
                nextLabel={tCc("next")}
                createLabel={tAc("createAudience")}
                creatingLabel={t("creating")}
              />
            </div>
          </div>
          <AudienceCreatorSummaryModal
            open={summaryOpen}
            onClose={() => setSummaryOpen(false)}
            score={score}
            audienceName={audienceName}
            typeLabel={typeLabel}
            clientName={ctx.clientName}
            country={country}
            typeChoice={typeChoice}
            sourceLabel={sourceLabel}
            ruleActionLabel={ruleActionLabel}
            windowDays={window_}
            lookalikePct={lookalikePct}
            seedName={selectedSeed?.name}
            ageMin={ageMin}
            ageMax={ageMax}
            genders={gendersReviewLabel}
            interests={interests}
          />
        </aside>
      </div>

      <div className="campaign-creator-footer-outer shrink-0 lg:hidden">
        <div className="campaign-creator-footer-band">
          <AudienceWizardNav
            placement="footer"
            onBack={goPrev}
            onNext={goNext}
            onCreate={handleCreate}
            showNext={step !== "review"}
            showCreate={step === "review"}
            nextDisabled={!canNext}
            createDisabled={tosBlocked}
            createPending={pending}
            backLabel={tCc("back")}
            nextLabel={tCc("next")}
            createLabel={tAc("createAudience")}
            creatingLabel={t("creating")}
          />
        </div>
      </div>
    </div>
  );
}
