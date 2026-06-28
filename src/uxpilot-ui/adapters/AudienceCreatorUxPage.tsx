"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Facebook,
  Globe,
  Instagram,
  Sparkles,
  UserCheck,
  Users
} from "lucide-react";

import { TosBanner } from "@/components/audiences/create/TosBanner";
import type { AudienceCreateContext, AudienceOptions } from "@/components/audiences/create/types";
import { Link } from "@/i18n/navigation";

type AudienceStepKey = "type" | "details" | "rules" | "review";
type AudienceTypeChoice = "custom" | "lookalike" | "saved" | "";

const AUDIENCE_STEPS: { id: AudienceStepKey; labelKey: string; sublabelKey: string }[] = [
  { id: "type", labelKey: "stepTypeLabel", sublabelKey: "stepTypeSublabel" },
  { id: "details", labelKey: "stepDetailsLabel", sublabelKey: "stepDetailsSublabel" },
  { id: "rules", labelKey: "stepRulesLabel", sublabelKey: "stepRulesSublabel" },
  { id: "review", labelKey: "stepReviewLabel", sublabelKey: "stepReviewSublabel" }
];

const STEP_ORDER: AudienceStepKey[] = ["type", "details", "rules", "review"];

type HubClient = { slug: string; name: string };

type Props = {
  ctx: AudienceCreateContext;
  clients: HubClient[];
  clientSlug: string;
  onClientChange: (slug: string) => void;
  onBack: () => void;
};

function AudienceStepItem({
  stepNum,
  label,
  sublabel,
  active,
  completed,
  onClick
}: {
  stepNum: number;
  label: string;
  sublabel: string;
  active: boolean;
  completed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex w-full items-start gap-3 px-1 py-3 text-left transition-all"
    >
      <div
        className="z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all"
        style={{
          background: completed ? "rgba(245,166,35,0.12)" : active ? "#f5a623" : "var(--surface-bg)",
          border: completed ? "2px solid #f5a623" : active ? "2px solid #f5a623" : "2px solid var(--border-color)",
          boxShadow: active ? "0 0 0 4px rgba(245,166,35,0.12)" : "none"
        }}
      >
        {completed ? (
          <Check size={13} style={{ color: "#f5a623" }} strokeWidth={2.5} />
        ) : (
          <span style={{ color: active ? "#0f1419" : "var(--text-dimmer)", fontSize: 11, fontWeight: 700 }}>
            {stepNum}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 pt-1.5">
        <p
          className="truncate font-heading text-sm font-semibold leading-tight"
          style={{ color: active ? "var(--amber)" : completed ? "var(--text-main)" : "var(--text-dim)" }}
        >
          {label}
        </p>
        <p className="mt-0.5 truncate font-body text-[11px]" style={{ color: "var(--text-dimmer)" }}>
          {sublabel}
        </p>
      </div>
    </button>
  );
}

function AudienceFormCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
      }}
    >
      {children}
    </div>
  );
}

function AudienceReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
        {label}
      </span>
      <span className="text-right font-body text-xs font-semibold" style={{ color: "var(--text-main)" }}>
        {value}
      </span>
    </div>
  );
}

export function AudienceCreatorUxPage({ ctx, clients, clientSlug, onClientChange, onBack }: Props) {
  const t = useTranslations("audiences");
  const ta = useTranslations("audienceCreator");
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<AudienceStepKey>("type");
  const [typeChoice, setTypeChoice] = useState<AudienceTypeChoice>("");
  const [audienceName, setAudienceName] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [source, setSource] = useState("instagram");
  const [window_, setWindow_] = useState("30");
  const [country, setCountry] = useState("BR");
  const [lookalikePct, setLookalikePct] = useState("1");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [genders, setGenders] = useState<string[]>(["Masculino", "Feminino"]);
  const [interests, setInterests] = useState("");
  const [ruleAction, setRuleAction] = useState("INSTAGRAM_PROFILE_FOLLOW");
  const [seedAudienceId, setSeedAudienceId] = useState("");
  const [options, setOptions] = useState<AudienceOptions | null>(null);
  const [tosBlocked, setTosBlocked] = useState(false);

  const currentIdx = STEP_ORDER.indexOf(step);
  const selectedClient = clients.find((c) => c.slug === clientSlug);

  const seedAudiences = useMemo(
    () => ctx.audiences.filter((a) => !(a.subtype ?? "").toUpperCase().includes("LOOKALIKE")),
    [ctx.audiences]
  );

  useEffect(() => {
    if (typeChoice !== "custom") return;
    const qs = new URLSearchParams({
      clientId: ctx.clientSlug,
      adAccountId: ctx.adAccountId,
      type: source === "site" ? "website" : "engagement"
    });
    fetch(`/api/meta/audience-creation/options?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setOptions(j as AudienceOptions);
      })
      .catch(() => {});
  }, [ctx.clientSlug, ctx.adAccountId, typeChoice, source]);

  useEffect(() => {
    if (seedAudiences.length && !seedAudienceId) {
      setSeedAudienceId(seedAudiences[0]?.id ?? "");
    }
  }, [seedAudiences, seedAudienceId]);

  const typeLabel =
    typeChoice === "custom"
      ? ta("typePersonalizado")
      : typeChoice === "lookalike"
        ? ta("typeLookalike")
        : typeChoice === "saved"
          ? ta("typeSalvo")
          : "—";

  const canNext =
    step === "type" ? typeChoice !== "" : step === "details" ? audienceName.trim() !== "" : true;

  const goNext = () => {
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

  const toggleGender = (g: string) =>
    setGenders((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const scoreItems = [
    { label: ta("scoreAudienceType"), done: typeChoice !== "" },
    { label: ta("scoreAudienceName"), done: audienceName.trim() !== "" },
    { label: ta("scoreCountryRegion"), done: country !== "" },
    { label: ta("scoreSourceRules"), done: step === "rules" || step === "review" }
  ];
  const score = Math.round((scoreItems.filter((s) => s.done).length / scoreItems.length) * 100);

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
            const eventMap: Record<string, string> = {
              PURCHASE: "Purchase",
              LEAD: "Lead",
              PAGE_ENGAGED: "PageView"
            };
            const res = await fetch("/api/meta/audiences/website", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                clientId: ctx.clientSlug,
                adAccountId: ctx.adAccountId,
                name: audienceName.trim(),
                pixelId,
                eventName: eventMap[ruleAction] ?? "PageView",
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
              source === "instagram"
                ? ruleAction === "INSTAGRAM_PROFILE_FOLLOW"
                  ? "ig_user_followed_business"
                  : "ig_business_profile_engaged"
                : "page_engaged";
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
          if (genders.length === 1 && genders.includes("Masculino")) targeting.genders = [1];
          else if (genders.length === 1 && genders.includes("Feminino")) targeting.genders = [2];
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

  const amberBtn = (enabled: boolean) => ({
    background: enabled ? "linear-gradient(135deg, #f5a623, #e8920d)" : "rgba(245,166,35,0.3)",
    color: enabled ? "#0f1419" : "rgba(15,20,25,0.4)",
    boxShadow: enabled ? "0 4px 14px rgba(245,166,35,0.3)" : "none",
    cursor: enabled ? ("pointer" as const) : ("not-allowed" as const)
  });

  return (
    <div
      className="-mx-4 flex min-h-[calc(100vh-5rem)] flex-col overflow-hidden md:-mx-6"
      style={{ background: "var(--surface-bg)" }}
    >
      <header
        className="sticky top-0 z-20 flex w-full shrink-0 items-center gap-3 border-b px-6 py-3"
        style={{
          background: "var(--surface-card)",
          borderColor: "var(--border-color)",
          boxShadow: "0 1px 0 var(--border-color)"
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
            <Link href="/audiences" className="hover:underline" style={{ color: "var(--text-dimmer)" }}>
              {ta("breadcrumbAudiences")}
            </Link>
            {" › "}
            <span style={{ color: "var(--text-dim)" }}>{ta("breadcrumbCreateNew")}</span>
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <h1 className="font-heading text-xl font-bold" style={{ color: "var(--text-main)" }}>
              {ta("pageTitle")}
            </h1>
            <span
              className="rounded px-2 py-0.5 font-heading text-xs font-semibold"
              style={{
                background: "rgba(245,166,35,0.15)",
                color: "var(--amber)",
                border: "1px solid rgba(245,166,35,0.3)"
              }}
            >
              {ta("draftBadge")}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border px-4 py-1.5 font-heading text-sm font-semibold transition-all hover:opacity-80"
          style={{
            borderColor: "var(--border-hover)",
            color: "var(--text-main)",
            background: "var(--surface-card)"
          }}
        >
          <ArrowLeft size={14} /> {ta("back")}
        </button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden" style={{ background: "var(--surface-bg)" }}>
        {/* LEFT */}
        <div
          className="hidden w-56 shrink-0 overflow-y-auto border-r px-4 py-6 lg:block"
          style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
        >
          <p
            className="mb-5 px-1 font-heading text-[10px] font-bold tracking-widest"
            style={{ color: "var(--text-dimmer)" }}
          >
            {ta("stepsLabel")}
          </p>
          <div className="relative flex flex-col gap-0">
            <div
              className="absolute bottom-8 left-[18px] top-8 w-px"
              style={{ background: "var(--border-color)" }}
            />
            {AUDIENCE_STEPS.map((s, i) => (
              <AudienceStepItem
                key={s.id}
                stepNum={i + 1}
                label={ta(s.labelKey)}
                sublabel={ta(s.sublabelKey)}
                active={step === s.id}
                completed={STEP_ORDER.indexOf(step) > i}
                onClick={() => {
                  if (STEP_ORDER.indexOf(step) >= i) setStep(s.id);
                }}
              />
            ))}
          </div>

          <div className="mt-8 px-1">
            <p
              className="mb-2 font-heading text-[10px] font-bold tracking-widest"
              style={{ color: "var(--text-dimmer)" }}
            >
              {ta("clientLabel")}
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setClientOpen(!clientOpen)}
                className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left font-body text-xs transition-all"
                style={{
                  background: "var(--surface-bg)",
                  borderColor: clientOpen ? "#f5a623" : "var(--border-color)",
                  color: "var(--text-main)"
                }}
              >
                <span className="truncate">{selectedClient?.name ?? t("selectClientFirst")}</span>
                <ChevronDown size={12} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
              </button>
              {clientOpen ? (
                <div
                  className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border shadow-xl"
                  style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}
                >
                  {clients.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => {
                        onClientChange(c.slug);
                        setClientOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left font-body text-xs transition-colors"
                      style={{ color: c.slug === clientSlug ? "var(--amber)" : "var(--text-dim)" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--row-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "";
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="min-w-0 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="mx-auto max-w-2xl space-y-5 px-8 py-7">
            <TosBanner
              clientSlug={ctx.clientSlug}
              adAccountId={ctx.adAccountId}
              onBlocked={setTosBlocked}
            />

            {step === "type" ? (
              <div className="animate-fade-up space-y-5">
                <div>
                  <h2 className="mb-1 font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                    {ta("audienceType")}
                  </h2>
                  <p className="font-body text-sm" style={{ color: "var(--text-dim)" }}>
                    {ta("selectCategory")}
                  </p>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      id: "custom" as AudienceTypeChoice,
                      label: ta("customAudience"),
                      desc: ta("customAudienceDesc"),
                      icon: Users,
                      color: "#818cf8"
                    },
                    {
                      id: "lookalike" as AudienceTypeChoice,
                      label: ta("lookalike"),
                      desc: ta("lookalikeDesc"),
                      icon: Copy,
                      color: "#10b981"
                    },
                    {
                      id: "saved" as AudienceTypeChoice,
                      label: ta("savedAudience"),
                      desc: ta("savedAudienceDesc"),
                      icon: Globe,
                      color: "#f59e0b"
                    }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTypeChoice(opt.id)}
                      className="flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all"
                      style={{
                        borderColor: typeChoice === opt.id ? opt.color : "var(--border-color)",
                        background: typeChoice === opt.id ? `${opt.color}10` : "var(--surface-card)",
                        boxShadow: typeChoice === opt.id ? `0 0 0 2px ${opt.color}30` : "none"
                      }}
                    >
                      <div
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${opt.color}18`, border: `1px solid ${opt.color}25` }}
                      >
                        <opt.icon size={18} style={{ color: opt.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                          {opt.label}
                        </p>
                        <p className="mt-0.5 font-body text-xs" style={{ color: "var(--text-dim)" }}>
                          {opt.desc}
                        </p>
                      </div>
                      <div
                        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all"
                        style={{
                          borderColor: typeChoice === opt.id ? opt.color : "var(--border-hover)",
                          background: typeChoice === opt.id ? opt.color : "transparent"
                        }}
                      >
                        {typeChoice === opt.id ? <div className="h-2 w-2 rounded-full bg-white" /> : null}
                      </div>
                    </button>
                  ))}
                </div>
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)" }}
                >
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#f5a623" }} />
                  <p className="font-body text-xs" style={{ color: "var(--text-dim)" }}>
                    {ta("typeHint")}
                  </p>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={!canNext}
                    onClick={goNext}
                    className="rounded-xl px-7 py-2.5 font-heading text-sm font-bold transition-all hover:brightness-110 active:scale-95"
                    style={amberBtn(canNext)}
                  >
                    {ta("nextDetails")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === "details" ? (
              <div className="animate-fade-up space-y-5">
                <div>
                  <h2 className="mb-1 font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                    {ta("audienceDetails")}
                  </h2>
                  <p className="font-body text-sm" style={{ color: "var(--text-dim)" }}>
                    {ta("audienceDetailsDesc")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="font-body text-sm font-medium" style={{ color: "var(--text-main)" }}>
                    {ta("audienceName")} <span style={{ color: "#f5a623" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={ta("audienceNamePlaceholder")}
                    value={audienceName}
                    onChange={(e) => setAudienceName(e.target.value)}
                    className="w-full rounded-xl border px-4 py-3 font-body text-sm outline-none transition-all"
                    style={{
                      background: "var(--surface-card)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-main)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#f5a623";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-color)";
                    }}
                  />
                </div>
                <AudienceFormCard>
                  <p className="mb-3 font-body text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                    {ta("countryRegion")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["BR", "PT", "US", "ES", "AR", "MX"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCountry(c)}
                        className="rounded-xl border px-4 py-2 font-heading text-sm font-semibold transition-all"
                        style={{
                          borderColor: country === c ? "#f5a623" : "var(--border-color)",
                          background: country === c ? "rgba(245,166,35,0.12)" : "var(--surface-bg)",
                          color: country === c ? "#f5a623" : "var(--text-dim)"
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </AudienceFormCard>
                {typeChoice === "custom" ? (
                  <AudienceFormCard>
                    <p className="mb-3 font-body text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      {ta("dataSource")}
                    </p>
                    <div className="flex gap-2">
                      {[
                        { v: "instagram", label: "Instagram", Icon: Instagram, color: "#f472b6" },
                        { v: "facebook", label: "Facebook", Icon: Facebook, color: "#818cf8" },
                        { v: "site", label: ta("sourceSitePixel"), Icon: Globe, color: "#10b981" }
                      ].map((s) => (
                        <button
                          key={s.v}
                          type="button"
                          onClick={() => setSource(s.v)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 font-body text-xs transition-all"
                          style={{
                            borderColor: source === s.v ? s.color : "var(--border-color)",
                            background: source === s.v ? `${s.color}12` : "var(--surface-bg)",
                            color: source === s.v ? s.color : "var(--text-dim)"
                          }}
                        >
                          <s.Icon size={13} /> {s.label}
                        </button>
                      ))}
                    </div>
                  </AudienceFormCard>
                ) : null}
                {typeChoice === "lookalike" ? (
                  <AudienceFormCard>
                    <p className="mb-1 font-body text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      {ta("similarityPercentage")}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {["1", "2", "3", "5", "10"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setLookalikePct(p)}
                          className="flex-1 rounded-xl border py-2.5 font-heading text-sm font-bold transition-all"
                          style={{
                            borderColor: lookalikePct === p ? "#10b981" : "var(--border-color)",
                            background: lookalikePct === p ? "rgba(16,185,129,0.12)" : "var(--surface-bg)",
                            color: lookalikePct === p ? "#10b981" : "var(--text-dim)"
                          }}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </AudienceFormCard>
                ) : null}
                {typeChoice === "saved" ? (
                  <AudienceFormCard>
                    <p className="mb-3 font-body text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      {ta("ageRange")}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="font-body text-xs" style={{ color: "var(--text-dim)" }}>
                          {ta("minAge")}
                        </label>
                        <input
                          type="number"
                          min={13}
                          max={65}
                          value={ageMin}
                          onChange={(e) => setAgeMin(e.target.value)}
                          className="w-full rounded-xl border px-3 py-2 font-body text-sm outline-none"
                          style={{
                            background: "var(--surface-bg)",
                            borderColor: "var(--border-color)",
                            color: "var(--text-main)"
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-body text-xs" style={{ color: "var(--text-dim)" }}>
                          {ta("maxAge")}
                        </label>
                        <input
                          type="number"
                          min={13}
                          max={65}
                          value={ageMax}
                          onChange={(e) => setAgeMax(e.target.value)}
                          className="w-full rounded-xl border px-3 py-2 font-body text-sm outline-none"
                          style={{
                            background: "var(--surface-bg)",
                            borderColor: "var(--border-color)",
                            color: "var(--text-main)"
                          }}
                        />
                      </div>
                    </div>
                    <p className="mb-2 mt-4 font-body text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      {ta("genders")}
                    </p>
                    <div className="flex gap-2">
                      {[
                        { v: "Masculino", label: ta("genderMale") },
                        { v: "Feminino", label: ta("genderFemale") },
                        { v: "Todos", label: ta("genderAll") }
                      ].map((g) => (
                        <button
                          key={g.v}
                          type="button"
                          onClick={() => toggleGender(g.v)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 font-body text-xs transition-all"
                          style={{
                            borderColor: genders.includes(g.v) ? "#f5a623" : "var(--border-color)",
                            background: genders.includes(g.v) ? "rgba(245,166,35,0.1)" : "var(--surface-bg)",
                            color: genders.includes(g.v) ? "#f5a623" : "var(--text-dim)"
                          }}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </AudienceFormCard>
                ) : null}
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    className="flex items-center gap-2 rounded-xl border px-5 py-2.5 font-heading text-sm font-semibold transition-all hover:opacity-80"
                    style={{
                      border: "1px solid var(--border-color)",
                      color: "var(--text-dim)",
                      background: "var(--surface-card)"
                    }}
                  >
                    <ArrowLeft size={14} /> {ta("back")}
                  </button>
                  <button
                    type="button"
                    disabled={!canNext}
                    onClick={goNext}
                    className="rounded-xl px-7 py-2.5 font-heading text-sm font-bold transition-all hover:brightness-110 active:scale-95"
                    style={amberBtn(canNext)}
                  >
                    {ta("nextRules")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === "rules" ? (
              <div className="animate-fade-up space-y-5">
                <div>
                  <h2 className="mb-1 font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                    {ta("audienceRules")}
                  </h2>
                  <p className="font-body text-sm" style={{ color: "var(--text-dim)" }}>
                    {ta("audienceRulesDesc")}
                  </p>
                </div>
                {typeChoice === "custom" ? (
                  <>
                    <AudienceFormCard>
                      <p className="mb-3 font-body text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                        {ta("engagementAction")}
                      </p>
                      <div className="space-y-2">
                        {[
                          { v: "INSTAGRAM_PROFILE_FOLLOW", label: ta("actionIgFollow") },
                          { v: "INSTAGRAM_PROFILE_ENGAGE", label: ta("actionIgEngage") },
                          { v: "PAGE_ENGAGED", label: ta("actionPageEngaged") },
                          { v: "PURCHASE", label: ta("actionPurchase") },
                          { v: "LEAD", label: ta("actionLead") }
                        ].map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setRuleAction(opt.v)}
                            className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all"
                            style={{
                              borderColor: ruleAction === opt.v ? "#f5a623" : "var(--border-color)",
                              background: ruleAction === opt.v ? "rgba(245,166,35,0.07)" : "var(--surface-bg)"
                            }}
                          >
                            <div
                              className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all"
                              style={{
                                borderColor: ruleAction === opt.v ? "#f5a623" : "var(--border-hover)",
                                background: ruleAction === opt.v ? "#f5a623" : "transparent"
                              }}
                            >
                              {ruleAction === opt.v ? (
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                              ) : null}
                            </div>
                            <span className="font-body text-sm" style={{ color: "var(--text-main)" }}>
                              {opt.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </AudienceFormCard>
                    <AudienceFormCard>
                      <p className="mb-3 font-body text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                        {ta("timeWindow")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {["7", "14", "30", "60", "90", "180"].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setWindow_(d)}
                            className="min-w-[48px] flex-1 rounded-xl border py-2.5 font-heading text-sm font-bold transition-all"
                            style={{
                              borderColor: window_ === d ? "#7c3aed" : "var(--border-color)",
                              background: window_ === d ? "rgba(124,58,237,0.12)" : "var(--surface-bg)",
                              color: window_ === d ? "#a78bfa" : "var(--text-dim)"
                            }}
                          >
                            {d}D
                          </button>
                        ))}
                      </div>
                    </AudienceFormCard>
                  </>
                ) : null}
                {typeChoice === "lookalike" ? (
                  <AudienceFormCard>
                    <p className="mb-3 font-body text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      {ta("seedAudience")}
                    </p>
                    <div className="space-y-2">
                      {seedAudiences.length ? (
                        seedAudiences.map((aud) => (
                          <button
                            key={aud.id}
                            type="button"
                            onClick={() => setSeedAudienceId(aud.id)}
                            className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all"
                            style={{
                              borderColor: seedAudienceId === aud.id ? "#10b981" : "var(--border-color)",
                              background:
                                seedAudienceId === aud.id ? "rgba(16,185,129,0.07)" : "var(--surface-bg)"
                            }}
                          >
                            <div
                              className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all"
                              style={{
                                borderColor: seedAudienceId === aud.id ? "#10b981" : "var(--border-hover)",
                                background: seedAudienceId === aud.id ? "#10b981" : "transparent"
                              }}
                            >
                              {seedAudienceId === aud.id ? (
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                              ) : null}
                            </div>
                            <span className="truncate font-body text-sm" style={{ color: "var(--text-main)" }}>
                              {aud.name}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="font-body text-sm" style={{ color: "var(--text-dim)" }}>
                          {t("noAudiences")}
                        </p>
                      )}
                    </div>
                  </AudienceFormCard>
                ) : null}
                {typeChoice === "saved" ? (
                  <AudienceFormCard>
                    <p className="mb-3 font-body text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                      {ta("interestsBehaviors")}
                    </p>
                    <input
                      type="text"
                      placeholder={ta("interestsPlaceholder")}
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      className="w-full rounded-xl border px-4 py-3 font-body text-sm outline-none transition-all"
                      style={{
                        background: "var(--surface-bg)",
                        borderColor: "var(--border-color)",
                        color: "var(--text-main)"
                      }}
                    />
                  </AudienceFormCard>
                ) : null}
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)" }}
                >
                  <Sparkles size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#a78bfa" }} />
                  <p className="font-body text-xs" style={{ color: "var(--text-dim)" }}>
                    {ta.rich("processingHint", {
                      strong: (chunks) => (
                        <strong style={{ color: "#a78bfa" }}>{chunks}</strong>
                      )
                    })}
                  </p>
                </div>
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    className="flex items-center gap-2 rounded-xl border px-5 py-2.5 font-heading text-sm font-semibold transition-all hover:opacity-80"
                    style={{
                      border: "1px solid var(--border-color)",
                      color: "var(--text-dim)",
                      background: "var(--surface-card)"
                    }}
                  >
                    <ArrowLeft size={14} /> {ta("back")}
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-xl px-7 py-2.5 font-heading text-sm font-bold transition-all hover:brightness-110 active:scale-95"
                    style={amberBtn(true)}
                  >
                    {ta("reviewNext")}
                  </button>
                </div>
              </div>
            ) : null}

            {step === "review" ? (
              <div className="animate-fade-up space-y-5">
                <div>
                  <h2 className="mb-1 font-heading text-lg font-bold" style={{ color: "var(--text-main)" }}>
                    {ta("review")}
                  </h2>
                  <p className="font-body text-sm" style={{ color: "var(--text-dim)" }}>
                    {ta("reviewDesc")}
                  </p>
                </div>
                <AudienceFormCard>
                  <div className="mb-5 flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}
                    >
                      <UserCheck size={18} style={{ color: "#a78bfa" }} />
                    </div>
                    <div>
                      <p className="font-heading text-sm font-bold" style={{ color: "var(--text-main)" }}>
                        {audienceName || "—"}
                      </p>
                      <p className="font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
                        {ta("audienceSummary")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <AudienceReviewRow label={ta("reviewType")} value={typeLabel} />
                    <AudienceReviewRow label={ta("reviewName")} value={audienceName || "—"} />
                    <AudienceReviewRow label={ta("reviewClient")} value={selectedClient?.name ?? "—"} />
                    <AudienceReviewRow label={ta("reviewCountry")} value={country} />
                    {typeChoice === "custom" ? (
                      <>
                        <AudienceReviewRow label={ta("reviewSource")} value={source} />
                        <AudienceReviewRow label={ta("reviewAction")} value={ruleAction} />
                        <AudienceReviewRow label={ta("reviewWindow")} value={ta("daysValue", { count: parseInt(window_, 10) || 0 })} />
                      </>
                    ) : null}
                    {typeChoice === "lookalike" ? (
                      <>
                        <AudienceReviewRow label={ta("reviewSimilarity")} value={`${lookalikePct}%`} />
                        <AudienceReviewRow label={ta("reviewSeedAudience")} value={selectedSeed?.name ?? "—"} />
                      </>
                    ) : null}
                    {typeChoice === "saved" ? (
                      <>
                        <AudienceReviewRow label={ta("reviewAgeRange")} value={ta("ageRangeValue", { min: ageMin, max: ageMax })} />
                        <AudienceReviewRow label={ta("reviewGenders")} value={genders.join(", ") || "—"} />
                        {interests ? <AudienceReviewRow label={ta("reviewInterests")} value={interests} /> : null}
                      </>
                    ) : null}
                  </div>
                </AudienceFormCard>
                <div
                  className="flex items-start gap-3 rounded-xl px-4 py-3"
                  style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}
                >
                  <Check size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#10b981" }} />
                  <p className="font-body text-xs" style={{ color: "var(--text-dim)" }}>
                    {ta.rich("readyHint", {
                      client: selectedClient?.name ?? "—",
                      strong: (chunks) => (
                        <strong style={{ color: "var(--text-main)" }}>{chunks}</strong>
                      )
                    })}
                  </p>
                </div>
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={goPrev}
                    className="flex items-center gap-2 rounded-xl border px-5 py-2.5 font-heading text-sm font-semibold transition-all hover:opacity-80"
                    style={{
                      border: "1px solid var(--border-color)",
                      color: "var(--text-dim)",
                      background: "var(--surface-card)"
                    }}
                  >
                    <ArrowLeft size={14} /> {ta("back")}
                  </button>
                  <button
                    type="button"
                    disabled={pending || tosBlocked}
                    onClick={handleCreate}
                    className="rounded-xl px-7 py-2.5 font-heading text-sm font-bold transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      color: "#fff",
                      boxShadow: "0 4px 14px rgba(124,58,237,0.35)"
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <UserCheck size={15} />
                      {pending ? t("creating") : ta("createAudience")}
                    </span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* RIGHT */}
        <div
          className="hidden w-64 shrink-0 space-y-5 overflow-y-auto border-l px-4 py-5 xl:block"
          style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
        >
          <div>
            <p className="mb-3 font-heading text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {ta("completeness")}
            </p>
            <div className="mb-3 flex items-center gap-3">
              <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
                <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="var(--border-color)" strokeWidth="4" />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    fill="none"
                    stroke="#f5a623"
                    strokeWidth="4"
                    strokeDasharray={2 * Math.PI * 22}
                    strokeDashoffset={2 * Math.PI * 22 - (score / 100) * 2 * Math.PI * 22}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <span className="absolute font-heading text-sm font-bold" style={{ color: "var(--amber)" }}>
                  {score}
                </span>
              </div>
              <p className="font-body text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
                {ta("completenessHint")}
              </p>
            </div>
            <div className="space-y-2">
              {scoreItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5">
                  <div
                    className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-all"
                    style={{
                      background: item.done ? "rgba(16,185,129,0.12)" : "var(--surface-bg)",
                      border: `1.5px solid ${item.done ? "#10b981" : "var(--border-hover)"}`
                    }}
                  >
                    {item.done ? <Check size={9} style={{ color: "#10b981" }} strokeWidth={3} /> : null}
                  </div>
                  <span
                    className="font-body text-xs"
                    style={{ color: item.done ? "var(--text-main)" : "var(--text-dimmer)" }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border-color)" }} />
          <div>
            <p className="mb-3 font-heading text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {ta("audiencePreview")}
            </p>
            <div
              className="overflow-hidden rounded-2xl"
              style={{ border: "1px solid var(--border-color)", background: "var(--surface-bg)" }}
            >
              <div
                className="flex h-24 items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #f0eeff 0%, #ede9fe 50%, #ddd6fe 100%)"
                }}
              >
                <div className="px-3 text-center">
                  <div
                    className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: "rgba(124,58,237,0.15)" }}
                  >
                    <Users size={20} style={{ color: "#7c3aed" }} />
                  </div>
                  <p className="font-body text-[10px]" style={{ color: "#6d28d9" }}>
                    {typeChoice ? typeLabel : ta("selectTypePreview")}
                  </p>
                </div>
              </div>
              <div className="p-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                <p className="truncate font-heading text-xs font-bold" style={{ color: "var(--text-main)" }}>
                  {audienceName || ta("audienceNamePreview")}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {country ? (
                    <span
                      className="rounded px-1.5 py-0.5 font-body text-[10px]"
                      style={{ background: "rgba(245,166,35,0.12)", color: "#f5a623" }}
                    >
                      {country}
                    </span>
                  ) : null}
                  {typeChoice === "custom" ? (
                    <span
                      className="rounded px-1.5 py-0.5 font-body text-[10px]"
                      style={{ background: "rgba(79,70,229,0.12)", color: "#818cf8" }}
                    >
                      {window_}D
                    </span>
                  ) : null}
                  {typeChoice === "lookalike" ? (
                    <span
                      className="rounded px-1.5 py-0.5 font-body text-[10px]"
                      style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
                    >
                      {lookalikePct}%
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border-color)" }} />
          <div>
            <p
              className="mb-3 font-heading text-[10px] font-semibold tracking-widest"
              style={{ color: "var(--text-dimmer)" }}
            >
              {ta("tipLabel")}
            </p>
            <div
              className="rounded-xl p-3"
              style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)" }}
            >
              <p className="font-body text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
                {typeChoice === "lookalike"
                  ? ta("tipLookalike")
                  : typeChoice === "custom"
                    ? ta("tipCustom")
                    : typeChoice === "saved"
                      ? ta("tipSaved")
                      : ta("tipDefault")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
