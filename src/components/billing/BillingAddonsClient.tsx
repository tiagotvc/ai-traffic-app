"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { BillingBackLink } from "@/components/billing/PlanLimitsCard";
import { resolveBillingCurrency } from "@/lib/billing/currency";
import { formatMoney } from "@/lib/billing/pricing";

type AddonKey = "clients" | "adAccounts" | "ai";

const ADDONS: Array<{
  key: AddonKey;
  priceCents: number;
  color: string;
}> = [
  { key: "clients", priceCents: 500, color: "from-blue-500 to-blue-600" },
  { key: "adAccounts", priceCents: 1000, color: "from-violet-500 to-violet-600" },
  { key: "ai", priceCents: 800, color: "from-pink-500 to-rose-600" }
];

export function BillingAddonsClient() {
  const t = useTranslations("billingPage");
  const locale = useLocale();
  const currency = resolveBillingCurrency(locale);
  const [selected, setSelected] = useState<AddonKey | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function requestAddon(key: AddonKey) {
    setSelected(key);
    setStatus("sending");
    try {
      const res = await fetch("/api/billing/addons/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addon: key })
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <BillingBackLink href="/billing" />

      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[var(--text-main)]">{t("addonsPageTitle")}</h1>
        <p className="mt-2 text-sm text-[var(--text-dim)]">{t("addonsPageSubtitle")}</p>
      </div>

      {status === "sent" ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          {t("addonRequestSent")}
        </div>
      ) : null}
      {status === "error" ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {t("addonRequestError")}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {ADDONS.map((addon) => (
          <button
            key={addon.key}
            type="button"
            disabled={status === "sending"}
            onClick={() => requestAddon(addon.key)}
            className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition hover:shadow-lg disabled:opacity-60 ${
              selected === addon.key
                ? "border-violet-400 ring-2 ring-violet-400/30"
                : "border-[var(--border-color)] bg-[var(--surface-card)] hover:border-[var(--amber)]/40"
            }`}
          >
            <div className={`mb-4 inline-flex rounded-lg bg-gradient-to-r ${addon.color} px-2.5 py-1 text-xs font-bold text-white`}>
              +1
            </div>
            <p className="font-bold text-[var(--text-main)]">
              {addon.key === "clients"
                ? t("addonPackClients")
                : addon.key === "adAccounts"
                  ? t("addonPackAdAccounts")
                  : t("addonPackAi")}
            </p>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              {addon.key === "clients"
                ? t("addonPackClientsDesc")
                : addon.key === "adAccounts"
                  ? t("addonPackAdAccountsDesc")
                  : t("addonPackAiDesc")}
            </p>
            <p className="mt-4 text-2xl font-bold text-[var(--text-main)]">
              {formatMoney(addon.priceCents, currency)}
              <span className="text-sm font-normal text-[var(--text-dimmer)]"> / {t("monthly").toLowerCase()}</span>
            </p>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-[var(--text-dimmer)]">{t("addonsFootnote")}</p>
    </div>
  );
}
