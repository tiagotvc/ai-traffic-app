"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent, trackMetaEvent } from "@/lib/analytics";
import { Link } from "@/i18n/navigation";
import { DsPageHeader } from "@/design-system";
import { BillingCheckoutSummary } from "@/components/billing/BillingCheckoutSummary";
import { BillingCardProcessing } from "@/components/billing/BillingCardProcessing";
import { BillingBackLink, type PlanCardData } from "@/components/billing/PlanLimitsCard";
import { BillingPixPayment } from "@/components/billing/BillingPixPayment";
import { BillingPortalSkeleton, CheckoutSummarySkeleton } from "@/components/billing/BillingSkeletons";
import type { PricingBreakdown } from "@/lib/billing/pricing";
import {
  planListCents,
  resolveBillingCurrency,
  resolvePlanMonthlyCents
} from "@/lib/billing/currency";
import { calculateCheckoutPricing, formatMoney } from "@/lib/billing/pricing";

import type { PaymentProvider } from "@/lib/billing/types";

const INSTALLMENT_OPTIONS = [2, 3, 6, 12] as const;

type PaymentRegion = "br" | "intl";

function defaultPaymentRegion(locale: string, providers: PaymentProvider[]): PaymentRegion {
  if (locale.startsWith("pt") && providers.includes("asaas")) return "br";
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-xs font-semibold text-[var(--text-dim)]">{children}</span>;
}

export function BillingCheckoutClient() {
  const t = useTranslations("billingPage");
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
  const [billingType, setBillingType] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [payInInstallments, setPayInInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState<number>(6);
  const [installmentOptions, setInstallmentOptions] = useState<InstallmentSimRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setPaymentRegion(defaultPaymentRegion(locale, providers));
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
  const showRegionToggle =
    providers.includes("asaas") && providers.includes("stripe");

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
      billingType,
      installmentCount: effectiveInstallments
    });
  }, [plan, cycle, billingType, effectiveInstallments, currency, checkoutProvider]);

  const displayPricing = appliedCoupon?.pricing ?? pricing;

  // Funnel "checkout" step — fire once per plan when the checkout is ready
  // (GA4 begin_checkout + Meta InitiateCheckout).
  const beginCheckoutFiredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!plan || !displayPricing) return;
    if (beginCheckoutFiredFor.current === plan.id) return;
    beginCheckoutFiredFor.current = plan.id;
    const value = Number((displayPricing.finalCents / 100).toFixed(2));
    trackEvent("begin_checkout", {
      plan_id: plan.id,
      plan_name: plan.name,
      value,
      currency,
      billing_cycle: cycle
    });
    void trackMetaEvent("InitiateCheckout", {
      customData: { value, currency, content_name: plan.name, content_ids: [plan.id] }
    });
  }, [plan, displayPricing, currency, cycle]);

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

    // Funnel "payment info" step (GA4 add_payment_info + Meta AddPaymentInfo).
    const value = Number((displayPricing.finalCents / 100).toFixed(2));
    trackEvent("add_payment_info", {
      plan_id: plan.id,
      value,
      currency,
      payment_method: isIntl ? "stripe" : billingType,
      billing_cycle: cycle
    });
    void trackMetaEvent("AddPaymentInfo", {
      customData: { value, currency, content_name: plan.name },
      userData: { email: customer.email || undefined, phone: customer.phone || undefined }
    });

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
          setError(j.error ?? t("checkoutError"));
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
          setError(tokJ.error ?? t("checkoutError"));
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
        setError(j.error ?? t("checkoutError"));
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

  return (
    <div className="w-full space-y-6">
      <DsPageHeader
        breadcrumbs={<BillingBackLink href="/billing/plans" />}
        title={t("checkoutTitle")}
        subtitle={t("checkoutSubtitle")}
        actions={
          <div className="inline-flex rounded-[var(--btn-radius)] border border-[var(--border-color)] bg-[var(--surface-bg)] p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`rounded-[var(--btn-radius)] px-5 py-2 text-sm font-bold transition ${
                cycle === "monthly" ? "bg-[var(--surface-card)] text-[var(--text-main)] shadow-sm" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
              }`}
            >
              {t("monthly")}
            </button>
            <button
              type="button"
              onClick={() => setCycle("yearly")}
              className={`inline-flex items-center rounded-[var(--btn-radius)] px-5 py-2 text-sm font-bold transition ${
                cycle === "yearly" ? "bg-[var(--surface-card)] text-[var(--text-main)] shadow-sm" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
              }`}
            >
              {t("yearly")}
              <span className="ml-2 inline-flex rounded-[var(--btn-radius-sm)] bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                -10%
              </span>
            </button>
          </div>
        }
      />

      {showRegionToggle ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4 shadow-sm">
          <span className="text-sm font-semibold text-[var(--text-dim)]">{t("paymentRegionLabel")}</span>
          <div className="inline-flex rounded-[var(--btn-radius)] border border-[var(--border-color)] bg-[var(--surface-bg)] p-1">
            <button
              type="button"
              onClick={() => setPaymentRegion("br")}
              className={`rounded-[var(--btn-radius)] px-4 py-2 text-sm font-semibold transition ${
                paymentRegion === "br" ? "bg-[var(--surface-card)] text-[var(--text-main)] shadow-sm" : "text-[var(--text-dim)]"
              }`}
            >
              {t("regionBr")}
            </button>
            <button
              type="button"
              onClick={() => setPaymentRegion("intl")}
              className={`rounded-[var(--btn-radius)] px-4 py-2 text-sm font-semibold transition ${
                paymentRegion === "intl" ? "bg-[var(--surface-card)] text-[var(--text-main)] shadow-sm" : "text-[var(--text-dim)]"
              }`}
            >
              {t("regionIntl")}
            </button>
          </div>
          {isIntl ? (
            <p className="text-xs text-[var(--text-dim)]">{t("stripeRedirectHint")}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
        <div className="lg:col-span-2 lg:sticky lg:top-6">
          {displayPricing ? (
            <BillingCheckoutSummary
              plan={plan}
              plans={plans}
              cycle={cycle}
              pricing={displayPricing}
              currency={currency}
              billingType={billingType}
              installmentSim={selectedInstallmentSim}
              onPlanChange={changePlan}
              planSwitcherLoading={summaryLoading}
              paymentProvider={checkoutProvider}
            />
          ) : (
            <CheckoutSummarySkeleton />
          )}
        </div>

        <form onSubmit={submit} className="space-y-5 lg:col-span-3">
          {!isIntl ? (
          <div className="rounded-xl border border-dashed border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)] p-5">
            <FieldLabel>{t("couponLabel")}</FieldLabel>
            <div className="flex flex-wrap gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder={t("couponPlaceholder")}
                className="ui-input min-w-[140px] flex-1 uppercase"
                disabled={Boolean(appliedCoupon)}
              />
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={clearCoupon}
                  className="ui-btn-secondary text-sm"
                >
                  {t("couponRemove")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="ui-btn-primary disabled:opacity-60"
                >
                  {couponLoading ? t("processing") : t("couponApply")}
                </button>
              )}
            </div>
            {couponError ? <p className="mt-2 text-xs text-red-600">{couponError}</p> : null}
            {appliedCoupon ? (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                {t("couponApplied", { code: appliedCoupon.code, percent: appliedCoupon.pricing.couponPercent ?? 0 })}
              </p>
            ) : null}
          </div>
          ) : null}

          {!isIntl ? (
          <div className="ui-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-dim)]">
              {t("paymentDetails")}
            </h3>

            <div className="mt-5">
              <FieldLabel>{t("checkoutPaymentMethod")}</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setBillingType("PIX")}
                  className={`rounded-[var(--btn-radius)] border-2 p-4 text-left transition ${
                    billingType === "PIX"
                      ? "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] ring-2 ring-[var(--ui-accent-ring)]"
                      : "border-[var(--border-color)] hover:border-[var(--ui-accent-border)]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-teal-600 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-white">
                      PIX
                    </span>
                    <span className="font-bold text-[var(--text-main)]">PIX</span>
                  </span>
                  <p className="mt-1 text-xs text-[var(--text-dim)]">{t("monthlyPixHint", { percent: 5 })}</p>
                  <span className="mt-2 inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    -{pixDiscount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingType("CREDIT_CARD")}
                  className={`rounded-[var(--btn-radius)] border-2 p-4 text-left transition ${
                    billingType === "CREDIT_CARD"
                      ? "border-[var(--ui-accent)] bg-[var(--ui-accent-muted)] ring-2 ring-[var(--ui-accent-ring)]"
                      : "border-[var(--border-color)] hover:border-[var(--ui-accent-border)]"
                  }`}
                >
                  <span className="font-bold text-[var(--text-main)]">{t("creditCard")}</span>
                  <p className="mt-1 text-xs text-[var(--text-dim)]">{t("checkoutCardHint")}</p>
                </button>
              </div>
            </div>

            {cycle === "yearly" && billingType === "CREDIT_CARD" ? (
              <div className="mt-5 space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-thead)] p-4">
                <FieldLabel>{t("installmentMode")}</FieldLabel>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPayInInstallments(false)}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                      !payInInstallments ? "bg-white text-[var(--text-main)] shadow-sm" : "text-[var(--text-dim)]"
                    }`}
                  >
                    {t("payInFull")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayInInstallments(true)}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                      payInInstallments ? "bg-white text-[var(--text-main)] shadow-sm" : "text-[var(--text-dim)]"
                    }`}
                  >
                    {t("payInstallments")}
                  </button>
                </div>
                {payInInstallments ? (
                  <div className="space-y-2">
                    {INSTALLMENT_OPTIONS.map((n) => {
                      const sim = installmentOptions.find((o) => o.installmentCount === n);
                      const parcel = sim?.paymentValueCents ?? Math.round((pricing?.finalCents ?? 0) / n);
                      return (
                        <label
                          key={n}
                          className={`flex cursor-pointer items-center justify-between rounded-[var(--btn-radius)] border px-3 py-2.5 transition ${
                            installmentCount === n
                              ? "border-[var(--ui-accent)] bg-[var(--surface-card)] ring-2 ring-[var(--ui-accent-ring)]"
                              : "border-[var(--border-color)] bg-[var(--surface-card)] hover:border-[var(--ui-accent-border)]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="installments"
                              checked={installmentCount === n}
                              onChange={() => setInstallmentCount(n)}
                              className="text-[var(--ui-accent)]"
                            />
                            <span className="text-sm font-semibold text-[var(--text-main)]">
                              {t("installmentOption", { count: n })}
                            </span>
                          </span>
                          <span className="text-right text-xs text-[var(--text-dim)]">
                            <span className="block font-bold text-[var(--text-main)]">
                              {formatMoney(parcel, currency)} × {n}
                            </span>
                            {sim && sim.feeValueCents > 0 ? (
                              <span className="text-[var(--text-dim)]">
                                {t("installmentFeeShort", { value: formatMoney(sim.feeValueCents, currency) })}
                              </span>
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

          <div className="ui-card p-6">
            <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-dim)]">
              {t("checkoutBillingInfo")}
            </h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <FieldLabel>{t("name")}</FieldLabel>
                <input
                  required
                  value={customer.name}
                  onChange={(e) => setCustomer((p) => ({ ...p, name: e.target.value }))}
                  className="ui-input w-full"
                />
              </label>
              <label className="block sm:col-span-2">
                <FieldLabel>{t("email")}</FieldLabel>
                <input
                  required
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer((p) => ({ ...p, email: e.target.value }))}
                  className="ui-input w-full"
                />
              </label>
              {!isIntl ? (
              <label className="block">
                <FieldLabel>{t("cpfCnpj")}</FieldLabel>
                <input
                  required
                  value={customer.cpfCnpj}
                  onChange={(e) => setCustomer((p) => ({ ...p, cpfCnpj: e.target.value }))}
                  className="ui-input w-full"
                />
              </label>
              ) : null}
              {!isIntl ? (
              <label className="block">
                <FieldLabel>{t("phone")}</FieldLabel>
                <input
                  required={billingType === "CREDIT_CARD"}
                  value={customer.phone}
                  onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))}
                  className="ui-input w-full"
                />
              </label>
              ) : null}
            </div>
          </div>

          {billingType === "CREDIT_CARD" && !isIntl ? (
            <>
              <div className="ui-card p-6">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-dim)]">
                  {t("checkoutAddress")}
                </h3>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel>{t("postalCode")}</FieldLabel>
                    <input
                      required
                      value={customer.postalCode}
                      onChange={(e) => setCustomer((p) => ({ ...p, postalCode: e.target.value }))}
                      className="ui-input w-full"
                      placeholder="00000-000"
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>{t("addressNumber")}</FieldLabel>
                    <input
                      required
                      value={customer.addressNumber}
                      onChange={(e) => setCustomer((p) => ({ ...p, addressNumber: e.target.value }))}
                      className="ui-input w-full"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <FieldLabel>{t("address")}</FieldLabel>
                    <input
                      value={customer.address}
                      onChange={(e) => setCustomer((p) => ({ ...p, address: e.target.value }))}
                      className="ui-input w-full"
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>{t("city")}</FieldLabel>
                    <input
                      value={customer.city}
                      onChange={(e) => setCustomer((p) => ({ ...p, city: e.target.value }))}
                      className="ui-input w-full"
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>{t("state")}</FieldLabel>
                    <input
                      value={customer.state}
                      onChange={(e) => setCustomer((p) => ({ ...p, state: e.target.value }))}
                      className="ui-input w-full"
                      maxLength={2}
                      placeholder="SP"
                    />
                  </label>
                </div>
              </div>

              <div className="ui-card p-6">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-dim)]">
                  {t("creditCard")}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-dim)]">{t("checkoutCardSecureHint")}</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel>{t("cardHolder")}</FieldLabel>
                    <input
                      required
                      autoComplete="cc-name"
                      value={card.holderName}
                      onChange={(e) => setCard((p) => ({ ...p, holderName: e.target.value }))}
                      className="ui-input w-full"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <FieldLabel>{t("cardNumber")}</FieldLabel>
                    <input
                      required
                      autoComplete="cc-number"
                      inputMode="numeric"
                      value={card.number}
                      onChange={(e) => setCard((p) => ({ ...p, number: e.target.value }))}
                      className="ui-input w-full"
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>MM</FieldLabel>
                    <input
                      required
                      autoComplete="cc-exp-month"
                      value={card.expiryMonth}
                      onChange={(e) => setCard((p) => ({ ...p, expiryMonth: e.target.value }))}
                      className="ui-input w-full"
                      maxLength={2}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>AAAA</FieldLabel>
                    <input
                      required
                      autoComplete="cc-exp-year"
                      value={card.expiryYear}
                      onChange={(e) => setCard((p) => ({ ...p, expiryYear: e.target.value }))}
                      className="ui-input w-full"
                      maxLength={4}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>CVV</FieldLabel>
                    <input
                      required
                      autoComplete="cc-csc"
                      inputMode="numeric"
                      value={card.ccv}
                      onChange={(e) => setCard((p) => ({ ...p, ccv: e.target.value }))}
                      className="ui-input w-full"
                      maxLength={4}
                    />
                  </label>
                </div>
              </div>
            </>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="ui-btn-primary w-full py-4 text-base font-bold disabled:opacity-60"
          >
            {loading
              ? t("processing")
              : isIntl
                ? t("continueOnStripe")
                : `${t("payNow")} · ${displayPricing ? formatMoney(selectedInstallmentSim?.totalCents ?? displayPricing.finalCents, currency) : ""}`}
          </button>
        </form>
      </div>
    </div>
  );
}
