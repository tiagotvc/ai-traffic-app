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
          "inline-flex gap-1 rounded-full p-1",
          isMarketing
            ? "border border-white/[0.06] bg-[#060a10] shadow-[inset_0_2px_12px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.04)]"
            : "rounded-[var(--btn-radius)] border border-[var(--border-color)] bg-[var(--surface-bg)] p-1 shadow-inner"
        )}
        role="group"
      >
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={cn(
            "rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-200",
            cycle === "monthly"
              ? isMarketing
                ? "bg-gradient-to-b from-white/18 to-white/8 text-white shadow-[0_3px_14px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-white/12"
                : "rounded-[var(--btn-radius)] bg-[var(--surface-card)] text-[var(--text-main)] shadow-sm"
              : isMarketing
                ? "text-violet-300/45 hover:text-violet-200/75"
                : "rounded-[var(--btn-radius)] text-[var(--text-dim)]"
          )}
        >
          {t("monthly")}
        </button>
        <button
          type="button"
          onClick={() => onChange("yearly")}
          className={cn(
            "inline-flex items-center rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-200",
            cycle === "yearly"
              ? isMarketing
                ? "bg-gradient-to-b from-white/18 to-white/8 text-white shadow-[0_3px_14px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.14)] ring-1 ring-white/12"
                : "rounded-[var(--btn-radius)] bg-[var(--surface-card)] text-[var(--text-main)] shadow-sm"
              : isMarketing
                ? "text-violet-300/45 hover:text-violet-200/75"
                : "rounded-[var(--btn-radius)] text-[var(--text-dim)]"
          )}
        >
          {t("yearly")}
          <span
            className={cn(
              "ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-black shadow-sm",
              cycle === "yearly" && isMarketing
                ? "bg-emerald-500 text-white"
                : isMarketing
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-emerald-500 text-white"
            )}
          >
            -{YEARLY_DISCOUNT_PERCENT}%
          </span>
        </button>
      </div>
    </div>
  );
}
