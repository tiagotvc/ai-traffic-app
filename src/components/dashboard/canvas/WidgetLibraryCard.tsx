"use client";

import { Crown, Plus, Star } from "lucide-react";
import { useTranslations } from "next-intl";

import { WidgetLibraryLivePreview } from "@/components/dashboard/canvas/WidgetLibraryLivePreview";
import { cn } from "@/lib/cn";
import { defaultWidgetConfig } from "@/lib/dashboard/widget-config";
import { premiumBadgeLabelKey, type PremiumBadgeKind } from "@/lib/dashboard/widget-premium";
import { Link } from "@/i18n/navigation";
import type { useDashboardData } from "@/uxpilot-ui/adapters/useDashboardData";

type DashboardData = ReturnType<typeof useDashboardData>;

export function WidgetLibraryCard({
  widget,
  category,
  premiumBadge,
  isFavorite,
  dashboardData,
  onToggleFavorite,
  onAdd,
  onClose
}: {
  widget: {
    type: string;
    titleKey: string;
    category: string;
    allowed: boolean;
    comingSoon?: boolean;
    isAiWidget?: boolean;
    isMasterBlaster?: boolean;
  };
  category: string;
  premiumBadge: PremiumBadgeKind | null;
  isFavorite: boolean;
  dashboardData?: DashboardData;
  onToggleFavorite: () => void;
  onAdd: () => void;
  onClose?: () => void;
}) {
  const t = useTranslations("dashboardWidgets");
  const locked = !widget.allowed;
  const canAdd = widget.allowed;
  const isPremiumTab = category === "premium";
  const config = defaultWidgetConfig(widget.type);

  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border transition-all duration-200",
        canAdd && "hover:-translate-y-0.5 hover:shadow-lg"
      )}
      style={{
        borderColor: isPremiumTab
          ? locked
            ? "rgba(245,158,11,0.18)"
            : "rgba(245,158,11,0.28)"
          : "var(--border-color)",
        background: isPremiumTab
          ? locked
            ? "linear-gradient(165deg, rgba(255,251,235,0.6) 0%, var(--surface-card) 55%)"
            : "linear-gradient(165deg, rgba(255,251,235,0.85) 0%, #ffffff 50%)"
          : "var(--surface-card)",
        boxShadow: isPremiumTab
          ? "0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 24px rgba(15,23,42,0.04)"
          : "0 1px 0 rgba(255,255,255,0.6) inset"
      }}
    >
      <div className="relative h-[100px] shrink-0 p-2.5 pb-0">
        <WidgetLibraryLivePreview
          widgetType={widget.type}
          titleKey={widget.titleKey}
          config={config}
          dashboardData={dashboardData}
          isPremium={isPremiumTab || !!premiumBadge}
        />
        {widget.comingSoon ? (
          <div
            className="absolute inset-2 flex items-center justify-center rounded-lg text-[9px] font-semibold uppercase tracking-wide backdrop-blur-[1px]"
            style={{ background: "rgba(15,23,42,0.55)", color: "var(--text-dim)" }}
          >
            {t("comingSoon")}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5 pt-2">
        <div className="min-h-0 flex-1">
          <div className="flex items-start gap-1.5">
            <p
              className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-snug"
              style={{ color: "var(--text-main)" }}
            >
              {t(widget.titleKey)}
            </p>
            {premiumBadge ? (
              <span
                className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide"
                style={{
                  background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(234,88,12,0.12))",
                  color: "#fbbf24",
                  boxShadow: "inset 0 0 0 1px rgba(245,158,11,0.25)"
                }}
              >
                {t(premiumBadgeLabelKey(premiumBadge))}
              </span>
            ) : null}
            {widget.isAiWidget && !isPremiumTab ? (
              <span
                className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[7px] font-semibold"
                style={{ background: "rgba(79,70,229,0.14)", color: "#a5b4fc" }}
              >
                IA
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
            {widget.comingSoon && !widget.isMasterBlaster
              ? t("comingSoon")
              : widget.allowed
                ? isPremiumTab
                  ? t("premiumIncluded")
                  : t("available")
                : widget.isMasterBlaster
                  ? t("masterBlasterAddonRequired")
                  : t("upgradeRequired")}
          </p>
        </div>

        <div className="flex items-center justify-end gap-1 border-t pt-2" style={{ borderColor: "var(--border-color)" }}>
          <button
            type="button"
            onClick={onToggleFavorite}
            className="rounded-md p-1.5 transition-colors hover:bg-white/5"
            aria-label="Favorite"
          >
            <Star
              size={14}
              fill={isFavorite ? "#f59e0b" : "none"}
              style={{ color: isFavorite ? "#f59e0b" : "var(--text-dimmer)" }}
            />
          </button>
          {canAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="rounded-lg p-1.5 transition-all hover:brightness-110"
              style={{
                background: isPremiumTab
                  ? "linear-gradient(135deg, rgba(245,158,11,0.25), rgba(234,88,12,0.15))"
                  : "rgba(79,70,229,0.16)",
                color: isPremiumTab ? "#fbbf24" : "#a5b4fc",
                boxShadow: isPremiumTab ? "inset 0 0 0 1px rgba(245,158,11,0.2)" : undefined
              }}
            >
              <Plus size={14} />
            </button>
          ) : isPremiumTab && !widget.allowed && widget.isMasterBlaster ? (
            <Link
              href="/billing/addons"
              className="rounded-lg p-1.5"
              style={{ background: "rgba(245,158,11,0.18)", color: "#fbbf24" }}
              title={t("masterBlasterCta")}
              onClick={onClose}
            >
              <Crown size={14} />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg p-1.5 opacity-35"
              style={{ background: "rgba(148,163,184,0.08)", color: "var(--text-dimmer)" }}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
