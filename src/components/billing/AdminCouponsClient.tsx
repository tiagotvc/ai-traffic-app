"use client";

import { Ticket } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { DsPageHeader } from "@/design-system";
import { FilterTextField } from "@/components/FilterTextField";

type CouponRow = {
  id: string;
  code: string;
  percentOff: number;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  minChargeCents: number;
  description: string | null;
};

export function AdminCouponsClient() {
  const t = useTranslations("billingAdmin");
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("99");
  const [maxUses, setMaxUses] = useState("");
  const [minCharge, setMinCharge] = useState("5");

  const reload = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/billing/coupons")
      .then(async (res) => {
        const j = await res.json();
        if (j.ok) setCoupons(j.coupons ?? []);
        else if (res.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/billing/coupons", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code,
        percentOff: Number(percentOff),
        maxUses: maxUses ? Number(maxUses) : null,
        minChargeCents: Math.round(Number(minCharge.replace(",", ".")) * 100)
      })
    });
    const j = await res.json();
    setMessage(j.ok ? t("couponCreated") : j.error);
    if (j.ok) {
      setCode("");
      reload();
    }
  }

  async function toggleActive(c: CouponRow) {
    await fetch(`/api/admin/billing/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive })
    });
    reload();
  }

  if (forbidden) {
    return <p className="text-sm text-[var(--text-dim)]">{t("forbiddenHint")}</p>;
  }

  return (
    <div className="w-full space-y-4">
      <DsPageHeader
        title={t("couponsTitle")}
        subtitle={t("couponsSubtitle")}
        titleIcon={<Ticket size={16} />}
      />

      {message ? (
        <div className="campaign-creator-card campaign-creator-card--compact px-4 py-3 text-sm text-[var(--text-main)]">
          {message}
        </div>
      ) : null}

      <form onSubmit={createCoupon} className="campaign-creator-card campaign-creator-card--compact">
        <h2 className="campaign-creator-orion-section-label mb-3">{t("couponCreate")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <FilterTextField
            creatorField
            icon={<Ticket size={14} />}
            label={t("couponCode")}
            value={code}
            onChange={(v) => setCode(v.toUpperCase())}
            placeholder="TESTE99"
          />
          <FilterTextField
            creatorField
            icon={<span className="text-xs font-bold">%</span>}
            label={t("couponPercent")}
            value={percentOff}
            onChange={setPercentOff}
            inputClassName="tabular-nums"
          />
          <FilterTextField
            creatorField
            icon={<span className="text-[10px] font-semibold">#</span>}
            label={t("couponMaxUses")}
            value={maxUses}
            onChange={setMaxUses}
            placeholder={t("couponUnlimited")}
          />
          <FilterTextField
            creatorField
            icon={<span className="text-[10px] font-semibold">R$</span>}
            label={t("couponMinCharge")}
            value={minCharge}
            onChange={setMinCharge}
          />
        </div>
        <button type="submit" className="mt-4 ui-btn-primary text-xs">
          {t("couponCreateBtn")}
        </button>
      </form>

      <div className="ui-campaign-table-shell ui-campaign-table-shell--compact overflow-hidden">
        <div className="ui-campaign-table-shell__header">
          <div className="ui-campaign-table-shell__title">
            <span className="ui-campaign-table-shell__icon">
              <Ticket size={15} strokeWidth={2} />
            </span>
            <span>{t("couponsTitle")}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="ui-campaign-table ui-campaign-table--compact w-full">
            <thead>
              <tr>
                <th>{t("couponCode")}</th>
                <th>{t("couponPercent")}</th>
                <th>{t("couponUsage")}</th>
                <th>{t("couponMinCharge")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--text-dimmer)]">
                    {t("loading")}
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--text-dimmer)]">
                    {t("couponEmpty")}
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono font-bold">{c.code}</td>
                    <td>{c.percentOff}%</td>
                    <td>
                      {c.usedCount}
                      {c.maxUses != null ? ` / ${c.maxUses}` : ` (${t("couponUnlimited")})`}
                    </td>
                    <td>R$ {(c.minChargeCents / 100).toFixed(2)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => toggleActive(c)}
                        className={
                          c.isActive
                            ? "ds-table-compact-badge ds-table-compact-badge--success"
                            : "ds-table-compact-badge ds-table-compact-badge--neutral"
                        }
                      >
                        {c.isActive ? t("couponActive") : t("inactive")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
