"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Activity,
  AlertCircle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Facebook,
  Globe,
  Instagram,
  MapPin,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  X
} from "lucide-react";

import { TosBanner } from "@/components/audiences/create/TosBanner";
import type { AudienceCreateContext, AudienceOptions } from "@/components/audiences/create/types";
import {
  ChoiceCardCheck,
  MultiSelectChoiceCard
} from "@/components/campaign-creator/BudgetChoiceCard";
import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { FilterTextField } from "@/components/FilterTextField";
import { PageTitleBlock } from "@/design-system/components/PageTitleBlock";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { UxHorizontalStepper, UxScoreItem } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

type AudienceStepKey = "type" | "details" | "rules" | "review";
type AudienceTypeChoice = "custom" | "lookalike" | "saved" | "";

const AUDIENCE_STEPS: { id: AudienceStepKey; label: string; sublabel: string }[] = [
  { id: "type", label: "Tipo de Público", sublabel: "Selecione a categoria" },
  { id: "details", label: "Detalhes", sublabel: "Nome e configurações" },
  { id: "rules", label: "Regras", sublabel: "Fonte e segmentação" },
  { id: "review", label: "Revisão", sublabel: "Confirmar e criar" }
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
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--row w-full",
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
          <Icon size={18} strokeWidth={1.75} />
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

function AudienceReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[color-mix(in_srgb,var(--border-color)_60%,transparent)] py-2.5 last:border-b-0">
      <span className="campaign-creator-review-summary-row__label">{label}</span>
      <span className="text-right text-sm font-medium text-[var(--text-main)]">{value}</span>
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

export function AudienceCreatorUxPage({ ctx, clients, clientSlug, onClientChange, onBack }: Props) {
  const t = useTranslations("audiences");
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<AudienceStepKey>("type");
  const [typeChoice, setTypeChoice] = useState<AudienceTypeChoice>("");
  const [audienceName, setAudienceName] = useState("");
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

  useEffect(() => {
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
  }, []);

  const typeLabel =
    typeChoice === "custom"
      ? "Personalizado"
      : typeChoice === "lookalike"
        ? "Lookalike"
        : typeChoice === "saved"
          ? "Salvo"
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
    { label: "Tipo de público", done: typeChoice !== "" },
    { label: "Nome do público", done: audienceName.trim() !== "" },
    { label: "País / Região", done: country !== "" },
    { label: "Fonte / Regras", done: step === "rules" || step === "review" }
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

  const stepperSteps = AUDIENCE_STEPS.map((s, i) => ({
    number: i + 1,
    label: s.label,
    disabled: currentIdx < i
  }));

  const tipText =
    typeChoice === "lookalike"
      ? "Públicos lookalike de 1% são mais precisos. Combine com exclusões para evitar duplicação."
      : typeChoice === "custom"
        ? "Janelas de 30–60 dias tendem a equilibrar tamanho e relevância para a maioria dos objetivos."
        : typeChoice === "saved"
          ? "Interesses muito amplos podem reduzir a eficiência. Prefira 3–5 interesses específicos."
          : "Escolha o tipo de público para ver dicas personalizadas.";

  const scoreCircumference = 2 * Math.PI * 32;
  const scoreOffset = scoreCircumference - (score / 100) * scoreCircumference;

  return (
    <div
      data-campaign-creator-shell
      className="app-shell-breakout flex min-h-0 flex-1 flex-col overflow-hidden"
      style={{ background: "var(--surface-bg)" }}
    >
      <header className="campaign-creator-header shrink-0 px-4 pb-3 pt-3 lg:pl-8 lg:pr-4 lg:pb-4 lg:pt-4">
        <div className="flex items-start justify-between gap-3">
          <PageTitleBlock
            className="flex-1"
            title="Criador de públicos"
            subtitle={
              <>
                <Link href="/audiences" className="hover:underline">
                  Públicos
                </Link>
                {" › Criar novo público"}
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
                Rascunho
              </span>
            }
          />
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-opacity hover:opacity-80 lg:h-8 lg:w-8"
          >
            <X size={20} strokeWidth={2} className="text-[var(--text-dim)]" />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_1fr] gap-x-8 overflow-x-visible overflow-y-hidden px-4 lg:grid-cols-[minmax(0,1fr)_16rem] lg:pl-8 lg:pr-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="campaign-creator-stepper-row col-start-1 row-start-1 flex shrink-0 items-center gap-3 border-b border-[var(--border-color)] py-2 lg:gap-4 lg:py-1.5">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <div className="campaign-creator-stepper w-full lg:max-w-3xl">
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

        <main className="campaign-creator-main-scroll relative col-start-1 row-start-2 flex min-h-0 min-w-0 w-full flex-col overflow-y-auto py-3">
          <div className="campaign-creator-main-scroll__inner mx-auto w-full max-w-xl pb-6">
            <div className="campaign-creator-section-stack">
              <TosBanner
                clientSlug={ctx.clientSlug}
                adAccountId={ctx.adAccountId}
                onBlocked={setTosBlocked}
              />

              {step === "type" ? (
                <div className="animate-fade-up space-y-4">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                      Tipo de Público
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      Selecione a categoria do público que deseja criar.
                    </p>
                  </div>

                  <section className="campaign-creator-card space-y-2">
                    {[
                      {
                        id: "custom" as AudienceTypeChoice,
                        label: "Público Personalizado",
                        desc: "Baseado em interações com seu perfil, site, app ou lista de clientes.",
                        icon: Users
                      },
                      {
                        id: "lookalike" as AudienceTypeChoice,
                        label: "Público Semelhante (Lookalike)",
                        desc: "Encontre pessoas com perfil parecido ao de seus melhores clientes.",
                        icon: Copy
                      },
                      {
                        id: "saved" as AudienceTypeChoice,
                        label: "Público Salvo",
                        desc: "Segmentação manual por interesses, dados demográficos e comportamentos.",
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
                  </section>

                  <div className="ui-alert-warning flex items-start gap-3 text-xs">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
                    <p>
                      O tipo escolhido define quais configurações estarão disponíveis nas próximas etapas.
                      Você poderá ajustar os detalhes antes de finalizar.
                    </p>
                  </div>
                </div>
              ) : null}

              {step === "details" ? (
                <div className="animate-fade-up space-y-4">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                      Detalhes do Público
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      Dê um nome e configure as opções básicas do público.
                    </p>
                  </div>

                  <section className="campaign-creator-card">
                    <FilterTextField
                      creatorField
                      icon={<Tag size={13} />}
                      label="Nome do público"
                      placeholder="Ex: [ENVOLV] [IG] Seguidores 30D"
                      value={audienceName}
                      onChange={setAudienceName}
                    />
                  </section>

                  <section className="campaign-creator-card space-y-3">
                    <h3 className="campaign-creator-section-title">País / Região</h3>
                    <div className="flex flex-wrap gap-2">
                      {["BR", "PT", "US", "ES", "AR", "MX"].map((c) => (
                        <MultiSelectChoiceCard
                          key={c}
                          selected={country === c}
                          label={c}
                          onToggle={() => setCountry(c)}
                          size="sm"
                        />
                      ))}
                    </div>
                  </section>

                  {typeChoice === "custom" ? (
                    <section className="campaign-creator-card space-y-3">
                      <h3 className="campaign-creator-section-title">Fonte de dados</h3>
                      <div className="flex flex-wrap gap-2">
                        <MultiSelectChoiceCard
                          selected={source === "instagram"}
                          label="Instagram"
                          icon={Instagram}
                          iconInline
                          onToggle={() => setSource("instagram")}
                          size="sm"
                        />
                        <MultiSelectChoiceCard
                          selected={source === "facebook"}
                          label="Facebook"
                          icon={Facebook}
                          iconInline
                          onToggle={() => setSource("facebook")}
                          size="sm"
                        />
                        <MultiSelectChoiceCard
                          selected={source === "site"}
                          label="Site (Pixel)"
                          icon={Globe}
                          iconInline
                          onToggle={() => setSource("site")}
                          size="sm"
                        />
                      </div>
                    </section>
                  ) : null}

                  {typeChoice === "lookalike" ? (
                    <section className="campaign-creator-card space-y-3">
                      <h3 className="campaign-creator-section-title">Porcentagem de similaridade</h3>
                      <div className="flex flex-wrap gap-2">
                        {["1", "2", "3", "5", "10"].map((p) => (
                          <MultiSelectChoiceCard
                            key={p}
                            selected={lookalikePct === p}
                            label={`${p}%`}
                            onToggle={() => setLookalikePct(p)}
                            size="sm"
                          />
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {typeChoice === "saved" ? (
                    <section className="campaign-creator-card space-y-4">
                      <div>
                        <h3 className="campaign-creator-section-title">Faixa etária</h3>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <CreatorNumberField
                            label="Idade mínima"
                            value={ageMin}
                            onChange={setAgeMin}
                            min={13}
                            max={65}
                          />
                          <CreatorNumberField
                            label="Idade máxima"
                            value={ageMax}
                            onChange={setAgeMax}
                            min={13}
                            max={65}
                          />
                        </div>
                      </div>
                      <div>
                        <h3 className="campaign-creator-section-title">Gêneros</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {["Masculino", "Feminino", "Todos"].map((g) => (
                            <MultiSelectChoiceCard
                              key={g}
                              selected={genders.includes(g)}
                              label={g}
                              onToggle={() => toggleGender(g)}
                              size="sm"
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
                      Regras do Público
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      Defina as ações e comportamentos que qualificam uma pessoa para este público.
                    </p>
                  </div>

                  {typeChoice === "custom" ? (
                    <>
                      <section className="campaign-creator-card space-y-2">
                        <h3 className="campaign-creator-section-title">Ação de engajamento</h3>
                        {[
                          { v: "INSTAGRAM_PROFILE_FOLLOW", label: "Seguiu o perfil do Instagram" },
                          { v: "INSTAGRAM_PROFILE_ENGAGE", label: "Interagiu com o perfil do Instagram" },
                          { v: "PAGE_ENGAGED", label: "Interagiu com a Página do Facebook" },
                          { v: "PURCHASE", label: "Realizou uma compra (Pixel)" },
                          { v: "LEAD", label: "Enviou um formulário de lead" }
                        ].map((opt) => (
                          <AudienceChoiceRow
                            key={opt.v}
                            selected={ruleAction === opt.v}
                            label={opt.label}
                            onSelect={() => setRuleAction(opt.v)}
                          />
                        ))}
                      </section>

                      <section className="campaign-creator-card space-y-3">
                        <h3 className="campaign-creator-section-title">Janela de tempo</h3>
                        <div className="flex flex-wrap gap-2">
                          {["7", "14", "30", "60", "90", "180"].map((d) => (
                            <MultiSelectChoiceCard
                              key={d}
                              selected={window_ === d}
                              label={`${d}D`}
                              onToggle={() => setWindow_(d)}
                              size="sm"
                            />
                          ))}
                        </div>
                      </section>
                    </>
                  ) : null}

                  {typeChoice === "lookalike" ? (
                    <section className="campaign-creator-card space-y-2">
                      <h3 className="campaign-creator-section-title">
                        Público-semente (fonte do lookalike)
                      </h3>
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
                      <h3 className="campaign-creator-section-title mb-3">
                        Interesses e comportamentos
                      </h3>
                      <FilterTextField
                        creatorField
                        icon={<Activity size={13} />}
                        label="Interesses"
                        placeholder="Ex: Marketing digital, Empreendedorismo, Saúde..."
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
                      Após criar o público, ele será enviado à Meta para processamento. Pode levar até{" "}
                      <strong className="text-[var(--ui-accent)]">30 minutos</strong> até estar disponível
                      para veiculação.
                    </p>
                  </div>
                </div>
              ) : null}

              {step === "review" ? (
                <div className="animate-fade-up space-y-4">
                  <div>
                    <h2 className="font-heading text-base font-semibold text-[var(--text-main)]">
                      Revisão
                    </h2>
                    <p className="mt-1 text-xs text-[var(--text-dim)]">
                      Confirme todas as configurações antes de criar o público.
                    </p>
                  </div>

                  <section className="campaign-creator-card">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                        <UserCheck size={18} strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="font-heading text-sm font-bold text-[var(--text-main)]">
                          {audienceName || "—"}
                        </p>
                        <p className="text-xs text-[var(--text-dimmer)]">Resumo do público a ser criado</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <AudienceReviewRow label="Tipo" value={typeLabel} />
                      <AudienceReviewRow label="Nome" value={audienceName || "—"} />
                      <AudienceReviewRow label="Cliente" value={selectedClient?.name ?? "—"} />
                      <AudienceReviewRow label="País" value={country} />
                      {typeChoice === "custom" ? (
                        <>
                          <AudienceReviewRow label="Fonte" value={source} />
                          <AudienceReviewRow label="Ação" value={ruleAction} />
                          <AudienceReviewRow label="Janela" value={`${window_} dias`} />
                        </>
                      ) : null}
                      {typeChoice === "lookalike" ? (
                        <>
                          <AudienceReviewRow label="Similaridade" value={`${lookalikePct}%`} />
                          <AudienceReviewRow label="Público-semente" value={selectedSeed?.name ?? "—"} />
                        </>
                      ) : null}
                      {typeChoice === "saved" ? (
                        <>
                          <AudienceReviewRow label="Faixa etária" value={`${ageMin} – ${ageMax} anos`} />
                          <AudienceReviewRow label="Gêneros" value={genders.join(", ") || "—"} />
                          {interests ? <AudienceReviewRow label="Interesses" value={interests} /> : null}
                        </>
                      ) : null}
                    </div>
                  </section>

                  <div className="ui-alert-success flex items-start gap-3 text-xs">
                    <Check size={15} className="mt-0.5 shrink-0" aria-hidden />
                    <p>
                      Tudo pronto! Ao confirmar, o público será criado e sincronizado com a conta de
                      anúncios de <strong>{selectedClient?.name ?? "—"}</strong> na Meta.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>

        <aside className="campaign-creator-sidebar hidden min-h-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col lg:overflow-hidden">
          <div className="campaign-creator-sidebar__scroll min-h-0 flex-1 overflow-y-auto">
            <div className="campaign-creator-sidebar__inner space-y-3 py-1">
              <div className="campaign-creator-sidebar-card">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">Completude</h3>
                  <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 font-heading text-[11px] font-semibold text-[var(--ui-accent)]">
                    {Math.round(((currentIdx + 1) / STEP_ORDER.length) * 100)}%
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
                    <svg className="h-[4.5rem] w-[4.5rem] -rotate-90" viewBox="0 0 72 72" aria-hidden>
                      <circle
                        cx="36"
                        cy="36"
                        r="32"
                        fill="none"
                        stroke="var(--border-color)"
                        strokeWidth="5"
                      />
                      <circle
                        cx="36"
                        cy="36"
                        r="32"
                        fill="none"
                        stroke="var(--ui-accent)"
                        strokeWidth="5"
                        strokeDasharray={scoreCircumference}
                        strokeDashoffset={scoreOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-heading text-lg font-bold text-[var(--ui-accent)]">
                      {score}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--text-dim)]">
                    Preencha todos os campos para maximizar a qualidade do público.
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {scoreItems.map((item) => (
                    <UxScoreItem key={item.label} label={item.label} done={item.done} />
                  ))}
                </div>
              </div>

              <div className="campaign-creator-sidebar-card space-y-3">
                <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">Cliente</h3>
                <FilterSelectDropdown
                  creatorField
                  icon={<Building2 size={14} />}
                  label={t("selectClient")}
                  placeholder={t("selectClientFirst")}
                  value={clientSlug}
                  onChange={onClientChange}
                  clearable={false}
                  options={clients.map((c) => ({ value: c.slug, label: c.name }))}
                />
              </div>

              <div className="campaign-creator-sidebar-card">
                <h3 className="mb-3 font-heading text-sm font-semibold text-[var(--text-main)]">
                  Prévia do público
                </h3>
                <div className="campaign-creator-sidebar-card-inset overflow-hidden">
                  <div
                    className="flex h-20 items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, color-mix(in srgb, var(--ui-accent) 8%, transparent), color-mix(in srgb, var(--ui-accent) 16%, transparent))"
                    }}
                  >
                    <div className="px-3 text-center">
                      <span className="mx-auto mb-1 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                        <Users size={18} strokeWidth={1.75} />
                      </span>
                      <p className="text-[10px] text-[var(--ui-accent)]">
                        {typeChoice ? typeLabel : "Selecione um tipo"}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-[var(--creator-card-border,var(--border-color))] p-3">
                    <p className="truncate font-heading text-xs font-bold text-[var(--text-main)]">
                      {audienceName || "Nome do público"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {country ? (
                        <span className="campaign-creator-review-badge campaign-creator-review-badge--accent">
                          <MapPin size={10} className="mr-0.5 inline" aria-hidden />
                          {country}
                        </span>
                      ) : null}
                      {typeChoice === "custom" ? (
                        <span className="campaign-creator-review-badge campaign-creator-review-badge--neutral">
                          {window_}D
                        </span>
                      ) : null}
                      {typeChoice === "lookalike" ? (
                        <span className="campaign-creator-review-badge campaign-creator-review-badge--success">
                          {lookalikePct}%
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="campaign-creator-sidebar-card">
                <p className="campaign-creator-orion-section-label mb-2">Dica</p>
                <p className="text-xs leading-relaxed text-[var(--text-dim)]">{tipText}</p>
              </div>

              <div className="hidden lg:block">
                <div className="ui-wizard-nav--sidebar">
                  <div className="ui-wizard-nav__actions">
                    <button
                      type="button"
                      onClick={goPrev}
                      className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium"
                    >
                      <ChevronLeft size={16} strokeWidth={2.5} />
                      Voltar
                    </button>
                    {step !== "review" ? (
                      <button
                        type="button"
                        disabled={!canNext}
                        onClick={goNext}
                        className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Próximo
                        <ChevronRight size={16} strokeWidth={2.5} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pending || tosBlocked}
                        onClick={handleCreate}
                        className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserCheck size={14} />
                        {pending ? t("creating") : "Criar público"}
                      </button>
                    )}
                  </div>
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
                onClick={goPrev}
                className="ui-wizard-nav__btn ui-wizard-nav__btn--back ui-btn-secondary inline-flex h-9 items-center justify-center gap-1 px-3.5 text-sm font-heading font-medium"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
                Voltar
              </button>
              {step !== "review" ? (
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={goNext}
                  className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-1 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Próximo
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending || tosBlocked}
                  onClick={handleCreate}
                  className="ui-wizard-nav__btn ui-wizard-nav__btn--next ui-btn-accent inline-flex h-9 items-center justify-center gap-2 px-4 text-sm font-heading font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserCheck size={14} />
                  {pending ? t("creating") : "Criar público"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
