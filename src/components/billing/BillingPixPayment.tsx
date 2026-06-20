"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BillingBackLink, type PlanCardData } from "@/components/billing/PlanLimitsCard";
import { formatMoney, type PricingBreakdown } from "@/lib/billing/pricing";

type PixPaymentProps = {
  invoiceId: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  plan: PlanCardData;
  cycle: "monthly" | "yearly";
  pricing: PricingBreakdown;
  currency?: string;
  locale: string;
};

function PixIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.2 11.4 10.8 9l7.6-7.6a2.2 2.2 0 0 0-3.1-3.1L7.7 5.9 5.3 3.5A2.2 2.2 0 0 0 2.2 6.6l2.4 2.4-2.4 2.4a2.2 2.2 0 1 0 3.1 3.1l2.4-2.4 2.4 2.4a2.2 2.2 0 0 0 3.1-3.1Zm-1.5 1.5 2.4-2.4 2.4 2.4-2.4 2.4-2.4-2.4ZM3.5 17.3l2.4-2.4 2.4 2.4-2.4 2.4-2.4-2.4Zm14.6-2.4 2.4 2.4 2.4-2.4-2.4-2.4-2.4 2.4Zm-7.1 7.1 2.4-2.4 2.4 2.4a2.2 2.2 0 0 1-3.1 3.1l-2.4-2.4-2.4 2.4a2.2 2.2 0 0 1-3.1-3.1l2.4-2.4-2.4-2.4a2.2 2.2 0 1 1 3.1-3.1l2.4 2.4 2.4-2.4a2.2 2.2 0 0 1 3.1 3.1l-2.4 2.4Z" />
    </svg>
  );
}

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
        {n}
      </span>
      <p className="pt-0.5 text-sm leading-snug text-[var(--text-dim)]">{label}</p>
    </div>
  );
}

export function BillingPixPayment({
  invoiceId,
  pixQrCode,
  pixCopyPaste,
  plan,
  cycle,
  pricing,
  currency = "USD",
  locale
}: PixPaymentProps) {
  const t = useTranslations("billingPage");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);

  const copyCode = useCallback(async () => {
    if (!pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback ignored */
    }
  }, [pixCopyPaste]);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/billing/invoices/${invoiceId}`);
        const j = await res.json();
        if (!active) return;
        if (j.invoice?.status === "paid") {
          setPaid(true);
          setTimeout(() => router.push(`/${locale}/billing?checkout=success`), 1200);
        } else if (j.invoice?.status === "confirmed") {
          /* aguardando saldo — mantém polling */
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [invoiceId, locale, router]);

  const period = cycle === "yearly" ? t("perYear") : t("perMonth");

  return (
    <div className="mx-auto max-w-md space-y-5">
      <BillingBackLink href="/billing" />

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)]/80 bg-white shadow-lg shadow-slate-200/50">
        <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <PixIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-50/90">PIX</p>
              <h1 className="text-xl font-bold">{t("pixTitle")}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-emerald-50/95">{t("pixHint")}</p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface-thead)]/80 px-4 py-3">
            <div>
              <p className="text-xs font-medium text-[var(--text-dim)]">{plan.name}</p>
              <p className="font-heading text-2xl font-bold tracking-tight text-[var(--text-main)]">
                {formatMoney(pricing.finalCents, currency)}
                <span className="ml-1 text-sm font-normal text-[var(--text-dim)]">{period}</span>
              </p>
            </div>
            {pricing.discountPercent > 0 ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                -{pricing.discountPercent}%
              </span>
            ) : null}
          </div>

          {paid ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 py-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white">
                ✓
              </span>
              <p className="text-lg font-semibold text-emerald-800">{t("pixPaidTitle")}</p>
              <p className="text-sm text-emerald-700">{t("pixPaidHint")}</p>
            </div>
          ) : (
            <>
              {pixQrCode ? (
                <div className="flex flex-col items-center">
                  <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-white p-4 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${pixQrCode}`}
                      alt="PIX QR Code"
                      className="h-52 w-52"
                    />
                  </div>
                  <p className="mt-3 text-center text-xs text-[var(--text-dim)]">{t("pixScanHint")}</p>
                </div>
              ) : null}

              {pixCopyPaste ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                    {t("pixCopyLabel")}
                  </p>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-thead)] p-3">
                    <p className="break-all font-mono text-[11px] leading-relaxed text-[var(--text-dim)]">
                      {pixCopyPaste}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyCode}
                    className={`w-full rounded-xl py-3 text-sm font-semibold transition ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-[var(--amber)] text-[#0f1419] hover:brightness-105"
                    }`}
                  >
                    {copied ? t("pixCopied") : t("pixCopy")}
                  </button>
                </div>
              ) : null}

              <div className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-thead)]/50 p-4">
                <StepBadge n={1} label={t("pixStep1")} />
                <StepBadge n={2} label={t("pixStep2")} />
                <StepBadge n={3} label={t("pixStep3")} />
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-dim)]">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {t("pixWaiting")}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border-color)] bg-[var(--surface-thead)]/50 px-6 py-4 sm:flex-row">
          <Link
            href={`/billing/invoices/${invoiceId}`}
            className="flex-1 rounded-xl border border-[var(--border-color)] bg-white py-2.5 text-center text-sm font-semibold text-[var(--text-dim)] transition hover:bg-[var(--surface-thead)]"
          >
            {t("viewInvoice")}
          </Link>
          <Link
            href="/billing"
            className="flex-1 rounded-xl py-2.5 text-center text-sm font-semibold text-[var(--violet)] transition hover:bg-[rgba(124,58,237,0.06)]"
          >
            {t("backToPortal")}
          </Link>
        </div>
      </div>
    </div>
  );
}
