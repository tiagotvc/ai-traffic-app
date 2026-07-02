"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { PlanCardData } from "@/components/billing/PlanLimitsCard";
import { DsButton } from "@/design-system";
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

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-xs font-bold text-emerald-400">
        {n}
      </span>
      <p className="pt-0.5 text-sm leading-snug text-white/60">{label}</p>
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
    <div
      data-theme="dark"
      data-campaign-creator-shell
      className="mx-auto w-full max-w-xl py-4 text-[var(--text-main)]"
    >
      <div className="overflow-hidden rounded-2xl border border-[var(--creator-card-border)] bg-[var(--creator-card-bg)] shadow-xl">
        <div className="border-b border-[var(--creator-card-border)] bg-[var(--creator-card-bg)] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-400">PIX</p>
              <h1 className="text-xl font-bold">{t("pixTitle")}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/55">{t("pixHint")}</p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex items-center justify-between rounded-xl border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-4 py-3">
            <div>
              <p className="text-xs font-medium text-white/45">{plan.name}</p>
              <p className="font-heading text-2xl font-bold tracking-tight text-white">
                {formatMoney(pricing.finalCents, currency)}
                <span className="ml-1 text-sm font-normal text-white/40">{period}</span>
              </p>
            </div>
            {pricing.discountPercent > 0 ? (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                -{pricing.discountPercent}%
              </span>
            ) : null}
          </div>

          {paid ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 py-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white">
                ✓
              </span>
              <p className="text-lg font-semibold text-emerald-300">{t("pixPaidTitle")}</p>
              <p className="text-sm text-emerald-300/70">{t("pixPaidHint")}</p>
            </div>
          ) : (
            <>
              {pixQrCode ? (
                <div className="flex flex-col items-center">
                  <div className="rounded-2xl border border-emerald-400/30 bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.2)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${pixQrCode}`}
                      alt="PIX QR Code"
                      className="h-52 w-52"
                    />
                  </div>
                  <p className="mt-3 text-center text-xs text-white/45">{t("pixScanHint")}</p>
                </div>
              ) : null}

              {pixCopyPaste ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
                    {t("pixCopyLabel")}
                  </p>
                  <div className="max-h-24 overflow-y-auto rounded-xl border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] p-3 ds-scroll">
                    <p className="break-all font-mono text-[11px] leading-relaxed text-white/55">
                      {pixCopyPaste}
                    </p>
                  </div>
                  <DsButton type="button" onClick={copyCode} variant="accent" size="lg" className="w-full">
                    {copied ? t("pixCopied") : t("pixCopy")}
                  </DsButton>
                </div>
              ) : null}

              <div className="space-y-3 rounded-xl border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] p-4">
                <StepBadge n={1} label={t("pixStep1")} />
                <StepBadge n={2} label={t("pixStep2")} />
                <StepBadge n={3} label={t("pixStep3")} />
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-white/45">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {t("pixWaiting")}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
