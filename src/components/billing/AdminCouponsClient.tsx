"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

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
  const [minCharge, setMinCharge] = useState("1");

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
    return <p className="text-sm text-slate-600">{t("forbiddenHint")}</p>;
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("couponsTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("couponsSubtitle")}</p>
      </div>

      {message ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          {message}
        </div>
      ) : null}

      <form onSubmit={createCoupon} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{t("couponCreate")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t("couponCode")}</span>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="ui-input mt-1 w-full uppercase"
              placeholder="TESTE99"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t("couponPercent")}</span>
            <input
              required
              type="number"
              min={1}
              max={100}
              value={percentOff}
              onChange={(e) => setPercentOff(e.target.value)}
              className="ui-input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t("couponMaxUses")}</span>
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder={t("couponUnlimited")}
              className="ui-input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">{t("couponMinCharge")}</span>
            <input
              required
              value={minCharge}
              onChange={(e) => setMinCharge(e.target.value)}
              className="ui-input mt-1 w-full"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-4 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("couponCreateBtn")}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">{t("couponCode")}</th>
              <th className="px-4 py-3">{t("couponPercent")}</th>
              <th className="px-4 py-3">{t("couponUsage")}</th>
              <th className="px-4 py-3">{t("couponMinCharge")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("loading")}
                </td>
              </tr>
            ) : coupons.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("couponEmpty")}
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                  <td className="px-4 py-3">{c.percentOff}%</td>
                  <td className="px-4 py-3">
                    {c.usedCount}
                    {c.maxUses != null ? ` / ${c.maxUses}` : ` (${t("couponUnlimited")})`}
                  </td>
                  <td className="px-4 py-3">R$ {(c.minChargeCents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleActive(c)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                        c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
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
  );
}
