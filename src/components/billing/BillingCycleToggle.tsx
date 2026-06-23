"use client";

import { useTranslations } from "next-intl";

import { YEARLY_DISCOUNT_PERCENT } from "@/lib/billing/pricing";
import { cn } from "@/lib/cn";

export function BillingCycleToggle({
  cycle,
  onChange,
  variant = "portal"
}: {
  cycle: "monthly" | "yearly";
  onChange: (cycle: "monthly" | "yearly") => void;
  variant?: "portal" | "marketing";
}) {
  const t = useTranslations("billingPage");
  const isMarketing = variant === "marketing";

  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "inline-flex rounded-2xl border p-1.5 shadow-inner",
          isMarketing ? "border-white/10 bg-white/5" : "border-[var(--border-color)] bg-slate-100/80"
        )}
      >
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={cn(
            "rounded-xl px-6 py-2.5 text-sm font-bold transition",
            cycle === "monthly"
              ? isMarketing
                ? "bg-white/10 text-white shadow-sm"
                : "bg-white text-[var(--text-main)] shadow-sm"
              : isMarketing
                ? "text-violet-200/60 hover:text-white"
                : "text-[var(--text-dim)]"
          )}
        >
          {t("monthly")}
        </button>
        <button
          type="button"
          onClick={() => onChange("yearly")}
          className={cn(
            "rounded-xl px-6 py-2.5 text-sm font-bold transition",
            cycle === "yearly"
              ? isMarketing
                ? "bg-white/10 text-white shadow-sm"
                : "bg-white text-[var(--text-main)] shadow-sm"
              : isMarketing
                ? "text-violet-200/60 hover:text-white"
                : "text-[var(--text-dim)]"
          )}
        >
          {t("yearly")}
          <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
            -{YEARLY_DISCOUNT_PERCENT}%
          </span>
        </button>
      </div>
    </div>
  );
}
