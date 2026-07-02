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
          "rounded-[var(--btn-radius)] border border-[var(--border-color)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-1 shadow-inner"
        )}
        role="group"
      >
        <button
          type="button"
          onClick={() => onChange("monthly")}
          className={cn(
            "rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-200",
            cycle === "monthly"
              ? "rounded-[var(--btn-radius)] bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)] shadow-sm"
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
              ? "rounded-[var(--btn-radius)] bg-[var(--ui-accent)] text-[var(--ui-accent-btn-text)] shadow-sm"
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
