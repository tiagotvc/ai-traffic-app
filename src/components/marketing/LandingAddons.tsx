import { getLocale, getTranslations } from "next-intl/server";

import { resolveBillingCurrency } from "@/lib/billing/currency";
import { formatMoney } from "@/lib/billing/pricing";
import { Link } from "@/i18n/navigation";
import { MarketingReveal } from "@/components/marketing/motion/MarketingReveal";

/** Mesmo catálogo do BillingAddonsClient (packs avulsos por mês). */
const ADDONS = [
  { key: "clients", priceCents: 500, nameKey: "addonPackClients", descKey: "addonPackClientsDesc" },
  { key: "adAccounts", priceCents: 1000, nameKey: "addonPackAdAccounts", descKey: "addonPackAdAccountsDesc" },
  { key: "ai", priceCents: 800, nameKey: "addonPackAi", descKey: "addonPackAiDesc" }
] as const;

/** Vitrine de add-ons na seção de pricing da landing — capacidade extra sem trocar de plano. */
export async function LandingAddons() {
  const t = await getTranslations("marketing");
  const tBilling = await getTranslations("billingPage");
  const locale = await getLocale();
  const currency = resolveBillingCurrency(locale);

  return (
    <MarketingReveal delay={0.1}>
      <div className="rounded-2xl border border-[var(--creator-card-border)] bg-[var(--creator-card-bg)] p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="mb-2 inline-flex rounded-md bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--ui-accent)]">
              {t("addonsBadge")}
            </span>
            <h3 className="font-heading text-lg font-bold text-[var(--text-main)]">{t("addonsTitle")}</h3>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{t("addonsSubtitle")}</p>
          </div>
          <Link
            href="/login?callbackUrl=/billing/addons"
            className="text-sm font-semibold text-[var(--ui-accent)] hover:underline"
          >
            {t("addonsCta")} →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {ADDONS.map((addon) => (
            <div
              key={addon.key}
              className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4 transition hover:border-[var(--ui-accent-border)]"
            >
              <p className="font-semibold text-[var(--text-main)]">{tBilling(addon.nameKey)}</p>
              <p className="mt-1 min-h-[2.5rem] text-xs leading-relaxed text-[var(--text-dim)]">
                {tBilling(addon.descKey)}
              </p>
              <p className="mt-3 font-heading text-xl font-bold text-[var(--text-main)]">
                {formatMoney(addon.priceCents, currency)}
                <span className="text-xs font-normal text-[var(--text-dimmer)]">
                  {" "}/ {tBilling("monthly").toLowerCase()}
                </span>
              </p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] text-[var(--text-dimmer)]">{t("addonsFootnote")}</p>
      </div>
    </MarketingReveal>
  );
}
