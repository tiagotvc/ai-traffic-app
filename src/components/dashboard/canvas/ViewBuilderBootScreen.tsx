"use client";

import { useTranslations } from "next-intl";

import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";
import { cn } from "@/lib/cn";

export function ViewBuilderBootScreen({
  variant = "building",
  className
}: {
  variant?: "building" | "opening";
  className?: string;
}) {
  const t = useTranslations("dashboardViews");

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex flex-col items-center justify-center gap-8 bg-[#0a0f14] px-6",
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="view-builder-boot-glow relative flex flex-col items-center gap-6">
        <div className="view-builder-boot-orbit flex h-28 w-28 items-center justify-center rounded-full">
          <OrionAgencyLogo size="lg" variant="dark" />
        </div>
        <div className="text-center">
          <p className="font-heading text-lg font-semibold tracking-wide text-white">
            {variant === "building" ? t("bootBuildingTitle") : t("bootOpeningTitle")}
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#94a3b8]">
            {variant === "building" ? t("bootBuildingHint") : t("bootOpeningHint")}
          </p>
        </div>
        <div className="flex items-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="view-builder-boot-dot h-1.5 w-1.5 rounded-full bg-[#f5a623]"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
