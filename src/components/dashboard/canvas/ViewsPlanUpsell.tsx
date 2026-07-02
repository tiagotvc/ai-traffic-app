"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, LayoutGrid } from "lucide-react";

import { Link } from "@/i18n/navigation";

export function ViewsPlanUpsell() {
  const t = useTranslations("dashboardApps");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 md:px-6">
      <div
        className="w-full max-w-lg rounded-2xl border p-8 text-center"
        style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: "rgba(79,70,229,0.12)" }}
        >
          <LayoutGrid size={22} style={{ color: "#818cf8" }} />
        </div>
        <h1 className="font-heading text-xl font-bold" style={{ color: "var(--text-main)" }}>
          {t("viewsUpsellTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
          {t("viewsUpsellHint")}
        </p>
        <Link
          href="/#pricing"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "#4f46e5" }}
        >
          {t("viewsUpsellCta")}
          <ArrowRight size={14} />
        </Link>
      </div>
    </main>
  );
}
