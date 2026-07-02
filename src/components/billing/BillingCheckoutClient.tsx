"use client";

import { Building2, Calendar, Check, Clock, CreditCard, Hash, IdCard, KeyRound, LockKeyhole, Mail, MapPin, Phone, Shield, Sparkles, Star, Ticket, User, Users, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";
import { UxHorizontalStepper } from "@/uxpilot-ui/adapters/ux-wizard-primitives";
import { BillingCardProcessing } from "@/components/billing/BillingCardProcessing";
import { BillingAtmosphere } from "@/components/billing/BillingAtmosphere";
import { useCheckoutCloseInterceptor } from "@/components/billing/CheckoutFullScreenShell";
import { BillingBackLink, type PlanCardData } from "@/components/billing/PlanLimitsCard";
import { BillingPixPayment } from "@/components/billing/BillingPixPayment";
import { BillingPortalSkeleton, CheckoutSummarySkeleton } from "@/components/billing/BillingSkeletons";
import { PaymentBrandMarks } from "@/components/billing/PaymentBrandMarks";
import { FilterTextField } from "@/components/FilterTextField";
import type { PricingBreakdown } from "@/lib/billing/pricing";
import {
  planListCents,
  resolveBillingCurrency,
  resolvePlanMonthlyCents
} from "@/lib/billing/currency";
import { calculateCheckoutPricing, formatMoney } from "@/lib/billing/pricing";
import { MARKETING_FEATURE_ROWS, PLUS_PAIRS, PLUS_SLUGS } from "@/lib/billing/plan-comparison";
import { DsButton, DsCheckerCard, DsSegmentedControl } from "@/design-system";

import type { PaymentProvider } from "@/lib/billing/types";

const INSTALLMENT_OPTIONS = [2, 3, 6, 12] as const;

/** Os 3 planos base (sem a variante Plus) — usados pelo toggle Normal/Plus do checkout. */
const BASE_TIER_SLUGS = Object.keys(PLUS_PAIRS);
const REVERSE_PLUS_PAIRS: Record<string, string> = Object.fromEntries(
  Object.entries(PLUS_PAIRS).map(([base, plus]) => [plus, base])
);
const CHECKOUT_FEATURE_KEYS = ["clients", "adAccounts", "aiCredits", "creativeRanking", "brain", "copilot", "reports"];
const CHECKOUT_FEATURE_LABELS: Record<string, string> = {
  clients: "checkoutFeatureClients",
  adAccounts: "checkoutFeatureAdAccounts",
  aiCredits: "checkoutFeatureAiCredits",
  creativeRanking: "checkoutFeatureRanking",
  brain: "checkoutFeatureBrain",
  copilot: "checkoutFeatureCopilot",
  reports: "checkoutFeatureReports"
};

/** Ícone + descrição curta de cada um dos 3 cards de plano, na mesma ordem de BASE_TIER_SLUGS. */
const TIER_META: Array<{ icon: typeof User; descKey: string }> = [
  { icon: User, descKey: "checkoutIndividualDescription" },
  { icon: Sparkles, descKey: "checkoutAdvancedDescription" },
  { icon: Users, descKey: "checkoutAgencyDescription" }
];
const TIER_NAMES = ["Individual", "Advanced", "Agency"] as const;

type PaymentRegion = "br" | "intl";

function defaultPaymentRegion(providers: PaymentProvider[]): PaymentRegion {
  // O provedor é detalhe de infraestrutura: sempre priorize o checkout completo
  // (cartão/PIX/boleto) quando ele estiver disponível, independentemente do idioma.
  if (providers.includes("asaas")) return "br";
  if (providers.includes("stripe")) return "intl";
  return "br";
}

type InstallmentSimRow = {
  installmentCount: number;
  paymentValueCents: number;
  feePercentage: number;
  feeValueCents: number;
  totalCents: number;
};

export function BillingCheckoutClient() {
  const t = useTranslations("billingPage");
  const setCloseInterceptor = useCheckoutCloseInterceptor();
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get("plan") ?? "";

  const [plans, setPlans] = useState<PlanCardData[]>([]);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [paymentRegion, setPaymentRegion] = useState<PaymentRegion | null>(null);
  const [plan, setPlan] = useState<PlanCardData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    pricing: PricingBreakdown;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [billingType, setBillingType] = useState<"PIX" | "CREDIT_CARD" | "PIX_AUTOMATIC">("CREDIT_CARD");
  const [payInInstallments, setPayInInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<number>(6);
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentSimRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<2 | 3>(2);
  const [dataStepError, setDataStepError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [pixData, setPixData] = useState<{
    invoiceId: string;
    pixQrCode?: string;
    pixCopyPaste?: string;
  } | null>(null);
  const [cardInvoiceId, setCardInvoiceId] = useState<string | null>(null);

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    cpfCnpj: "",
    phone: "",
    postalCode: "",
    address: "",
    addressNumber: "",
    city: "",
    state: ""
  });

  const [card, setCard] = useState({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: ""
  });
  const [company, setCompany] = useState("");

  useEffect(() => {
    if (!pixData) return;
    setCloseInterceptor(() => setPixData(null));
    return () => setCloseInterceptor(null);
  }, [pixData, setCloseInterceptor]);

  useEffect(() => {
    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((j) => {
        setPlans((j.plans as PlanCardData[]) ?? []);
        setProviders((j.providers as PaymentProvider[]) ?? []);
      })
      .finally(() => setInitialLoading(false));
  }, []);

  useEffect(() => {
    if (!providers.length || paymentRegion) return;
    setPaymentRegion(defaultPaymentRegion(providers));
  }, [providers, locale, paymentRegion]);

  useEffect(() => {
    if (!plans.length) return;
    const p = plans.find((x) => x.id === planId) ?? null;
    setPlan(p);
    setAppliedCoupon(null);
    setCouponError(null);
    setSummaryLoading(false);
  }, [planId, plans]);

  useEffect(() => {
    if (cycle === "monthly") setPayInInstallments(false);
  }, [cycle]);

  const checkoutProvider: PaymentProvider =
    paymentRegion === "intl" ? "stripe" : "asaas";
  const isIntl = checkoutProvider === "stripe";
  const currency = resolveBillingCurrency(locale, checkoutProvider);

  const effectiveInstallments =
    cycle === "yearly" && billingType === "CREDIT_CARD" && payInInstallments ? installmentCount : 1;

  const pricing = useMemo(() => {
    if (!plan) return null;
    return calculateCheckoutPricing({
      priceMonthlyCents: resolvePlanMonthlyCents(plan, currency),
      listCents: planListCents(plan, cycle, currency),
      cycle,
      provider: checkoutProvider,
      billingType: billingType === "PIX_AUTOMATIC" ? "PIX" : billingType,
      installmentCount: effectiveInstallments
    });
  }, [plan, cycle, billingType, effectiveInstallments, currency, checkoutProvider]);

  const displayPricing = appliedCoupon?.pricing ?? pricing;

  useEffect(() => {
    if (isIntl) {
      setAppliedCoupon(null);
      setCouponInput("");
      setCouponError(null);
    }
  }, [isIntl]);

  useEffect(() => {
    if (!displayPricing || billingType !== "CREDIT_CARD" || !payInInstallments) {
      setInstallmentOptions([]);
      return;
    }
    const q = new URLSearchParams({ valueCents: String(displayPricing.finalCents) });
    fetch(`/api/billing/installment-simulate?${q}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setInstallmentOptions(j.options ?? []);
      })
      .catch(() => setInstallmentOptions([]));
  }, [displayPricing?.finalCents, billingType, payInInstallments]);

  const selectedInstallmentSim =
    installmentOptions.find((o) => o.installmentCount === installmentCount) ?? null;

  function changePlan(id: string) {
    if (id === planId) return;
    setSummaryLoading(true);
    router.replace(`/billing/checkout?plan=${id}`, { scroll: false });
  }

  function advanceToPayment() {
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email);
    const brDataIsValid = isIntl || Boolean(customer.cpfCnpj.trim() && customer.phone.trim());
    if (!customer.name.trim() || !emailIsValid || !brDataIsValid) {
      setDataStepError(t("checkoutRequiredFields"));
      return;
    }
    setDataStepError(null);
    setCheckoutStep(3);
  }

  // Toggle Normal/Plus: troca a variante do plano selecionado mantendo o mesmo "tier" (ex.:
  // advanced -> advanced-pro), sem mexer nos 3 planos base já escolhidos por quem chegou aqui.
  const tierVariant: "base" | "plus" = plan && PLUS_SLUGS.has(plan.slug) ? "plus" : "base";
  function setTierVariant(next: "base" | "plus") {
    if (!plan || next === tierVariant) return;
    const baseSlug = tierVariant === "plus" ? (REVERSE_PLUS_PAIRS[plan.slug] ?? plan.slug) : plan.slug;
    const targetSlug = next === "plus" ? (PLUS_PAIRS[baseSlug] ?? baseSlug) : baseSlug;
    const target = plans.find((p) => p.slug === targetSlug);
    if (target) changePlan(target.id);
  }

  async function applyCoupon() {
    if (!plan || !pricing || !couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/billing/coupons/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: couponInput.trim(),
          planId: plan.id,
          cycle,
          billingType,
          installmentCount: effectiveInstallments
        })
      });
      const j = await res.json();
      if (!j.ok) {
        setCouponError(j.error ?? t("couponInvalid"));
        setAppliedCoupon(null);
        return;
      }
      setAppliedCoupon({ code: j.code, pricing: j.pricing });
    } catch {
      setCouponError(t("couponInvalid"));
    } finally {
      setCouponLoading(false);
    }
  }

  function clearCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!plan || !displayPricing || !paymentRegion) return;
    setLoading(true);
    setError(null);
    setAccountExists(false);
    try {
      if (isIntl) {
        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            planId: plan.id,
            cycle,
            paymentRegion: "intl",
            locale,
            customer: { name: customer.name, email: customer.email }
          })
        });
        const j = await res.json();
        if (!j.ok) {
          if (j.error === "ACCOUNT_EXISTS") {
            setAccountExists(true);
            setError(t("checkoutAccountExists"));
          } else {
            setError(t("checkoutError"));
          }
          return;
        }
        if (j.checkoutUrl) {
          window.location.href = j.checkoutUrl;
          return;
        }
        setError(t("checkoutError"));
        return;
      }

      let creditCardToken: string | undefined;

      if (billingType === "CREDIT_CARD") {
        const tokRes = await fetch("/api/billing/tokenize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ customer, creditCard: card })
        });
        const tokJ = await tokRes.json();
        if (!tokJ.ok) {
          if (tokJ.error === "ACCOUNT_EXISTS") {
            setAccountExists(true);
            setError(t("checkoutAccountExists"));
          } else {
            setError(t("checkoutError"));
          }
          return;
        }
        creditCardToken = tokJ.creditCardToken;
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          cycle,
          paymentRegion: "br",
          locale,
          billingType,
          installmentCount: effectiveInstallments,
          couponCode: appliedCoupon?.code,
          creditCardToken,
          customer
        })
      });
      const j = await res.json();
      if (!j.ok) {
        if (j.error === "ACCOUNT_EXISTS") {
          setAccountExists(true);
          setError(t("checkoutAccountExists"));
        } else {
          setError(t("checkoutError"));
        }
        return;
      }
      if (j.pixQrCode || j.pixCopyPaste) {
        setPixData({
          invoiceId: j.invoiceId,
          pixQrCode: j.pixQrCode,
          pixCopyPaste: j.pixCopyPaste
        });
        return;
      }
      if (j.invoiceId && billingType === "CREDIT_CARD") {
        setCardInvoiceId(j.invoiceId);
      }
    } catch {
      setError(t("checkoutError"));
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading || !paymentRegion) {
    return <BillingPortalSkeleton />;
  }

  if (!plan) {
    return (
      <div className="w-full space-y-4">
        <BillingBackLink href="/billing/plans" />
        <p className="text-sm text-[var(--text-dim)]">
          {t("planNotFound")}{" "}
          <Link href="/billing/plans" className="font-semibold ui-link">
            {t("choosePlan")}
          </Link>
        </p>
      </div>
    );
  }

  if (pixData && pricing) {
    return (
      <BillingPixPayment
        invoiceId={pixData.invoiceId}
        pixQrCode={pixData.pixQrCode}
        pixCopyPaste={pixData.pixCopyPaste}
        plan={plan}
        cycle={cycle}
        pricing={pricing}
        currency={currency}
        locale={locale}
      />
    );
  }

  if (cardInvoiceId && pricing) {
    return (
      <BillingCardProcessing
        invoiceId={cardInvoiceId}
        plan={plan}
        cycle={cycle}
        pricing={pricing}
        currency={currency}
        locale={locale}
      />
    );
  }

  const pixDiscount = cycle === "yearly" ? "15%" : "5%";

  const dLabel = "mb-1.5 block text-xs font-semibold text-white/55";

  return (
    <div data-theme="dark" data-campaign-creator-shell className="relative mx-auto w-full max-w-[1360px] text-[var(--text-main)]">
      {/* Fundo estrelado full-bleed, atrás das duas colunas */}
      <BillingAtmosphere fixed />

      <div className="grid gap-10">
        {/* Coluna esquerda: marca + seleção de plano (sempre visível) */}
        <div className="space-y-5 py-1">
          <OrionAgencyLogo size="xl" variant="dark" className="checkout-orion-logo" />

          <div>
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--ui-accent)] bg-[var(--ui-accent)] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-[var(--ui-accent-btn-text)] shadow-[0_0_22px_var(--ui-accent-glow-strong)]">
              <Star size={14} className="fill-current" aria-hidden />
              {t("checkoutTrialBadge")}
            </span>

            <h1 className="max-w-xl font-heading text-3xl font-bold leading-[1.08] text-white sm:text-4xl">
              {t("checkoutHeroTitle")}{" "}
              <span className="text-[var(--ui-accent)]">{t("checkoutHeroAccent")}</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
              {t("checkoutHeroSubtitle")}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white/45">
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-emerald-500" aria-hidden />
                {t("checkoutNoCommitment")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-[var(--ui-accent)]" aria-hidden />
                {t("checkoutCancelAnytime")}
              </span>
              <span className="flex items-center gap-1.5">
                <Shield size={13} className="text-[var(--ui-accent)]" aria-hidden />
                {t("checkoutSecureEnvironment")}
              </span>
            </div>
          </div>

          <div className="mb-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            <DsSegmentedControl
              ariaLabel="Ciclo de cobrança"
              value={cycle}
              onChange={setCycle}
              className="p-1.5 [&_button]:relative [&_button]:overflow-visible [&_button]:px-5 [&_button]:py-2.5 [&_button]:text-sm"
              options={[
                { value: "monthly", label: t("monthly") },
                { value: "yearly", label: t("yearly"), badge: "-10%" }
              ]}
            />
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-white/55">{t("checkoutChoosePlanLabel")}</span>
              <DsSegmentedControl
                ariaLabel={t("checkoutPlanVariant")}
                value={tierVariant}
                onChange={setTierVariant}
                className="p-1.5 [&_button]:px-5 [&_button]:py-2.5 [&_button]:text-sm"
                options={[{ value: "base", label: t("checkoutNormal") }, { value: "plus", label: "Plus" }]}
              />
            </div>
          </div>

          {plans.length ? (
            (() => {
              const tierSlugs = BASE_TIER_SLUGS.map((slug) =>
                tierVariant === "plus" ? (PLUS_PAIRS[slug] ?? slug) : slug
              );
              const tierPlans = tierSlugs
                .map((slug) => plans.find((p) => p.slug === slug))
                .filter((p): p is PlanCardData => Boolean(p));

              const priceFor = (p: PlanCardData) =>
                calculateCheckoutPricing({
                  priceMonthlyCents: resolvePlanMonthlyCents(p, currency),
                  listCents: planListCents(p, cycle, currency),
                  cycle,
                  provider: checkoutProvider,
                  billingType: billingType === "PIX_AUTOMATIC" ? "PIX" : billingType
                }).finalCents;

              return (
                <div className="grid gap-3 sm:grid-cols-3">
                  {tierPlans.map((p, i) => {
                    const isSelected = p.id === planId;
                    const isRecommended = i === 1;
                    const meta = TIER_META[i];
                    const Icon = meta?.icon ?? Sparkles;
                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={() => changePlan(p.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            changePlan(p.id);
                          }
                        }}
                        className={`relative flex min-h-[460px] cursor-pointer flex-col gap-4 rounded-xl border p-6 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ui-accent)] ${
                          isSelected
                            ? "border-[var(--ui-accent)] bg-[linear-gradient(135deg,rgba(124,58,237,0.22),rgba(124,58,237,0.08)),var(--creator-card-bg)] shadow-[0_0_0_1px_var(--ui-accent-border)]"
                            : isRecommended
                              ? "border-[var(--ui-accent-border)] bg-[var(--creator-card-bg)]"
                              : "border-[var(--creator-card-border)] bg-[var(--creator-card-bg)]"
                        }`}
                      >
                        {tierVariant === "plus" ? (
                          <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 shadow-md">
                            <Star size={12} className="fill-black text-black" aria-hidden />
                          </span>
                        ) : null}
                        {isRecommended ? (
                          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--ui-accent)] px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.06em] text-[var(--ui-accent-btn-text)] shadow-[0_6px_18px_var(--ui-accent-glow)]">
                            {t("mostPopular")}
                          </span>
                        ) : null}
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                          <Icon size={19} aria-hidden />
                        </span>
                        <div>
                          <p className="text-base font-bold text-white">
                            {tierVariant === "plus" ? `${TIER_NAMES[i]} Plus` : p.name}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-white/50">{meta ? t(meta.descKey) : null}</p>
                        </div>
                        <p>
                          <span className="text-2xl font-black text-white">
                            {formatMoney(priceFor(p), currency)}
                          </span>
                          <span className="ml-1 text-xs font-medium text-white/45">
                            /{t(cycle === "yearly" ? "yearly" : "monthly")}
                          </span>
                        </p>
                        <ul className="space-y-2.5 border-t border-white/10 pt-4">
                          {MARKETING_FEATURE_ROWS.filter((row) => CHECKOUT_FEATURE_KEYS.includes(row.key)).map((row) => {
                            const value = row.values[p.slug];
                            const available = value !== false;
                            const featureColor =
                              row.key === "brain"
                                ? "text-[var(--ui-accent)]"
                                : row.key === "copilot"
                                  ? "text-sky-400"
                                  : "text-emerald-400";
                            let displayValue: string | number =
                              typeof value === "boolean" ? (value ? t("included") : t("notIncluded")) : (value ?? "—");
                            if (value === "Ilimitado") {
                              displayValue = locale.startsWith("pt") ? "Ilimitado" : "Unlimited";
                            } else if (typeof value === "string" && /scientists|cientistas/i.test(value)) {
                              displayValue = t("checkoutScientists", { count: Number.parseInt(value, 10) });
                            }
                            return (
                              <li key={row.key} className="flex items-center justify-between gap-3 text-xs text-white/65">
                                <span className="flex min-w-0 items-center gap-1.5">
                                  {available ? (
                                    <Check size={13} className={`shrink-0 ${featureColor}`} aria-hidden />
                                  ) : (
                                    <X size={13} className="shrink-0 text-[var(--danger)]" aria-hidden />
                                  )}
                                  <span className={available && (row.key === "brain" || row.key === "copilot") ? featureColor : undefined}>
                                    {t(CHECKOUT_FEATURE_LABELS[row.key])}
                                  </span>
                                </span>
                                <span className={available ? "shrink-0 font-semibold text-white/80" : "shrink-0 text-white/30"}>
                                  {displayValue}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                        <DsButton
                          onClick={() => changePlan(p.id)}
                          variant={isSelected || isRecommended ? "accent" : "accentOutline"}
                          size="lg"
                          className="mt-auto w-full"
                        >
                          {t("choosePlan")}
                        </DsButton>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <CheckoutSummarySkeleton />
          )}

          <Link
            href="/#pricing"
            target="_blank"
            className="block text-xs font-medium text-white/40 underline-offset-2 hover:text-white/60 hover:underline"
          >
            {t("checkoutFullComparison")}
          </Link>

        </div>

        {/* Card flutuante (direita): stepper + dados/pagamento */}
        <div className="rounded-2xl border border-[var(--creator-card-border)] bg-[var(--creator-card-bg)] p-5 shadow-xl sm:p-7">
        {/* Stepper — mesmo componente do resto do produto (UxHorizontalStepper) */}
        <div className="mb-6">
          <UxHorizontalStepper
            size="compact"
            steps={[
              { number: 1, label: t("checkoutStepPlan"), disabled: true },
              { number: 2, label: t("checkoutStepData"), disabled: true },
              { number: 3, label: t("checkoutStepPayment"), disabled: true },
              { number: 4, label: t("checkoutStepDone"), disabled: true }
            ]}
            current={checkoutStep}
            onStepClick={(step) => {
              if (step === 2) setCheckoutStep(2);
            }}
          />
        </div>

        <form onSubmit={submit} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-5">
            {checkoutStep === 2 ? (
              <>
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                      <User size={14} aria-hidden />
                    </span>
                    <h2 className="text-base font-bold text-white">{t("checkoutAccountData")}</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FilterTextField
                        creatorField
                        icon={<User size={13} />}
                        label={t("name")}
                        value={customer.name}
                        onChange={(value) => setCustomer((p) => ({ ...p, name: value }))}
                        placeholder={t("checkoutNamePlaceholder")}
                    />
                    <FilterTextField
                        creatorField
                        icon={<Mail size={13} />}
                        label={t("email")}
                        type="email"
                        value={customer.email}
                        onChange={(value) => setCustomer((p) => ({ ...p, email: value }))}
                        placeholder="seu@email.com"
                    />
                    <div className="sm:col-span-2">
                      <FilterTextField
                        creatorField
                        icon={<Building2 size={13} />}
                        label={t("checkoutCompanyOptional")}
                        value={company}
                        onChange={setCompany}
                        placeholder={t("checkoutCompanyPlaceholder")}
                      />
                    </div>
                    {!isIntl ? (
                      <FilterTextField
                          creatorField
                          icon={<IdCard size={13} />}
                          label={t("cpfCnpj")}
                          value={customer.cpfCnpj}
                          onChange={(value) => setCustomer((p) => ({ ...p, cpfCnpj: value }))}
                      />
                    ) : null}
                    {!isIntl ? (
                      <FilterTextField
                          creatorField
                          icon={<Phone size={13} />}
                          label={t("phone")}
                          value={customer.phone}
                          onChange={(value) => setCustomer((p) => ({ ...p, phone: value }))}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  {dataStepError ? <p className="text-sm text-red-300">{dataStepError}</p> : null}
                  <DsButton type="button" variant="accent" size="lg" className="w-full" onClick={advanceToPayment}>
                    {t("checkoutContinuePayment")}
                  </DsButton>
                </div>
              </>
            ) : null}

            {checkoutStep === 3 ? (
              <>
              {!isIntl ? (
                <div className="rounded-xl border border-dashed border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] p-4">
                <div className="flex flex-wrap gap-2">
                  <FilterTextField
                    creatorField
                    icon={<Ticket size={13} />}
                    label={t("couponLabel")}
                    value={couponInput}
                    onChange={(value) => setCouponInput(value.toUpperCase())}
                    placeholder={t("couponPlaceholder")}
                    disabled={Boolean(appliedCoupon)}
                    className="h-12 min-h-12"
                    inputClassName="uppercase"
                    suffix={
                      appliedCoupon ? (
                        <DsButton type="button" onClick={clearCoupon} variant="secondary" size="md">
                          {t("couponRemove")}
                        </DsButton>
                      ) : (
                        <DsButton
                          type="button"
                          onClick={applyCoupon}
                          disabled={couponLoading || !couponInput.trim()}
                          variant="accent"
                          size="md"
                        >
                          {couponLoading ? t("processing") : t("couponApply")}
                        </DsButton>
                      )
                    }
                  />
                  </div>
                  {couponError ? <p className="mt-2 text-xs text-red-400">{couponError}</p> : null}
                  {appliedCoupon ? (
                    <p className="mt-2 text-xs font-semibold text-emerald-400">
                      {t("couponApplied", { code: appliedCoupon.code, percent: appliedCoupon.pricing.couponPercent ?? 0 })}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!isIntl ? (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                      <CreditCard size={14} aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-white">{t("paymentDetails")}</h2>
                      <p className="text-xs text-white/45">{t("checkoutPaymentMethodHint")}</p>
                    </div>
                  </div>
                  <div className="grid w-full gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("paymentDetails")}>
                    {(
                      [
                        { type: "CREDIT_CARD" as const, label: t("creditCard"), discount: false },
                        { type: "PIX" as const, label: "PIX", discount: true },
                        { type: "PIX_AUTOMATIC" as const, label: t("pixAutomatic"), discount: true }
                      ]
                    ).map(({ type, label, discount }) => (
                      <div key={type} className="relative">
                        {discount ? (
                          <span className="pointer-events-none absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-sm">
                            {t("checkoutSave", { discount: pixDiscount })}
                          </span>
                        ) : null}
                        <DsCheckerCard
                          title={label}
                          icon={
                            type === "CREDIT_CARD" ? (
                              <CreditCard size={16} aria-hidden />
                            ) : (
                              <span className="rounded bg-teal-600 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-white">
                                PIX
                              </span>
                            )
                          }
                          selected={billingType === type}
                          onSelect={() => setBillingType(type)}
                          inline
                        />
                      </div>
                    ))}
                  </div>

                  {cycle === "yearly" && billingType === "CREDIT_CARD" ? (
                    <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <span className={dLabel}>{t("installmentMode")}</span>
                      <div className="flex gap-2">
                        <DsButton
                          type="button"
                          onClick={() => setPayInInstallments(false)}
                          variant={!payInInstallments ? "accent" : "ghost"}
                          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                            !payInInstallments ? "text-white" : "text-white/50"
                          }`}
                        >
                          {t("payInFull")}
                        </DsButton>
                        <DsButton
                          type="button"
                          onClick={() => setPayInInstallments(true)}
                          variant={payInInstallments ? "accent" : "ghost"}
                          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                            payInInstallments ? "text-white" : "text-white/50"
                          }`}
                        >
                          {t("payInstallments")}
                        </DsButton>
                      </div>
                      {payInInstallments ? (
                        <div className="space-y-2">
                          {INSTALLMENT_OPTIONS.map((n) => {
                            const sim = installmentOptions.find((o) => o.installmentCount === n);
                            const parcel = sim?.paymentValueCents ?? Math.round((pricing?.finalCents ?? 0) / n);
                            return (
                              <label
                                key={n}
                                className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 transition ${
                                  installmentCount === n
                                    ? "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)]"
                                    : "border-white/10 bg-white/[0.02]"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name="installments"
                                    checked={installmentCount === n}
                                    onChange={() => setInstallmentCount(n)}
                                  />
                                  <span className="text-sm font-semibold text-white">
                                    {t("installmentOption", { count: n })}
                                  </span>
                                </span>
                                <span className="text-right text-xs text-white/50">
                                  <span className="block font-bold text-white">
                                    {formatMoney(parcel, currency)} × {n}
                                  </span>
                                  {sim && sim.feeValueCents > 0 ? (
                                    <span>{t("installmentFeeShort", { value: formatMoney(sim.feeValueCents, currency) })}</span>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {billingType === "CREDIT_CARD" && !isIntl ? (
                <div className="flex flex-col gap-4">
                  <div className="order-3 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
                    <FilterTextField
                        creatorField
                        icon={<MapPin size={13} />}
                        label={t("postalCode")}
                        value={customer.postalCode}
                        onChange={(value) => setCustomer((p) => ({ ...p, postalCode: value }))}
                        placeholder="00000-000"
                    />
                    <FilterTextField
                        creatorField
                        icon={<Hash size={13} />}
                        label={t("addressNumber")}
                        value={customer.addressNumber}
                        onChange={(value) => setCustomer((p) => ({ ...p, addressNumber: value }))}
                    />
                    <div className="sm:col-span-2">
                      <FilterTextField
                        creatorField
                        icon={<MapPin size={13} />}
                        label={t("address")}
                        value={customer.address}
                        onChange={(value) => setCustomer((p) => ({ ...p, address: value }))}
                      />
                    </div>
                    <FilterTextField
                        creatorField
                        icon={<Building2 size={13} />}
                        label={t("city")}
                        value={customer.city}
                        onChange={(value) => setCustomer((p) => ({ ...p, city: value }))}
                    />
                    <FilterTextField
                        creatorField
                        icon={<MapPin size={13} />}
                        label={t("state")}
                        value={customer.state}
                        onChange={(value) => setCustomer((p) => ({ ...p, state: value }))}
                        maxLength={2}
                        placeholder="SP"
                    />
                  </div>

                  <div className="order-1">
                    <div className="mb-2 flex items-center justify-end">
                      <PaymentBrandMarks />
                    </div>
                    <div className="grid gap-3 min-[480px]:grid-cols-2">
                      <FilterTextField
                        creatorField
                        icon={<CreditCard size={13} />}
                        label={t("cardNumber")}
                        autoComplete="cc-number"
                        inputMode="numeric"
                        value={card.number}
                        onChange={(value) => setCard((p) => ({ ...p, number: value }))}
                        placeholder="1234 5678 9012 3456"
                      />
                      <FilterTextField
                          creatorField
                          icon={<User size={13} />}
                          label={t("cardHolder")}
                          autoComplete="cc-name"
                          value={card.holderName}
                          onChange={(value) => setCard((p) => ({ ...p, holderName: value }))}
                          placeholder={t("checkoutCardHolderPlaceholder")}
                      />
                    </div>
                  </div>
                  <div className="order-2 grid gap-3 min-[480px]:grid-cols-2">
                    <FilterTextField
                        creatorField
                        icon={<Calendar size={13} />}
                        label={t("checkoutExpiry")}
                        autoComplete="cc-exp"
                        value={`${card.expiryMonth}${card.expiryYear ? `/${card.expiryYear}` : ""}`}
                        onChange={(value) => {
                          const [month = "", year = ""] = value.replace(/\s/g, "").split("/");
                          setCard((p) => ({ ...p, expiryMonth: month.slice(0, 2), expiryYear: year.slice(0, 4) }));
                        }}
                        maxLength={7}
                        placeholder="MM/AAAA"
                    />
                    <FilterTextField
                        creatorField
                        icon={<KeyRound size={13} />}
                        label="CVC"
                        autoComplete="cc-csc"
                        inputMode="numeric"
                        value={card.ccv}
                        onChange={(value) => setCard((p) => ({ ...p, ccv: value }))}
                        maxLength={4}
                        placeholder="123"
                    />
                  </div>
                </div>
              ) : null}

              {isIntl ? (
                <p className="text-xs text-white/45">
                  {t("checkoutHostedPaymentHint")}
                </p>
              ) : null}

              {displayPricing ? (
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div>
                    <p className="text-xs text-white/45">{t("checkoutOrderSummary")}</p>
                    <p className="text-sm font-bold text-white">{plan?.name}</p>
                  </div>
                  <p className="text-lg font-black text-white">
                    {formatMoney(selectedInstallmentSim?.totalCents ?? displayPricing.finalCents, currency)}
                    <span className="ml-1 text-[10px] font-medium text-white/40">
                      /{t(cycle === "yearly" ? "yearly" : "monthly")}
                    </span>
                  </p>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                  {accountExists ? (
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(`/billing/checkout?plan=${planId}`)}`}
                      className="ml-1 font-semibold text-[var(--ui-accent)] underline underline-offset-2"
                    >
                      Fazer login
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <DsButton
                type="submit"
                disabled={loading}
                variant="accent"
                size="lg"
                className="w-full"
              >
                <LockKeyhole size={15} aria-hidden />
                {loading
                  ? t("processing")
                  : t("startFreeTrial")}
              </DsButton>
              <p className="text-center text-[11px] text-white/35">
                {t("checkoutLegalHint")}
              </p>
              <DsButton
                type="button"
                variant="ghost"
                size="sm"
                className="mx-auto text-white/50"
                onClick={() => setCheckoutStep(2)}
              >
                {t("checkoutBackToData")}
              </DsButton>
              </>
            ) : null}
            </div>
        </form>
      </div>
      </div>
    </div>
  );
}
