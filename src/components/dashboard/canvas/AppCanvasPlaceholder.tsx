"use client";

import { useTranslations } from "next-intl";
import { LayoutGrid, Plus } from "lucide-react";

import { cn } from "@/lib/cn";

export function AppCanvasPlaceholder({
  variant,
  onAction,
  submitting = false,
  actionDisabled = false,
  hintOnly = false,
  className
}: {
  variant: "gallery" | "canvas";
  onAction?: () => void;
  submitting?: boolean;
  actionDisabled?: boolean;
  hintOnly?: boolean;
  className?: string;
}) {
  const tApps = useTranslations("dashboardApps");
  const tW = useTranslations("dashboardWidgets");

  const isGallery = variant === "gallery";
  const title = isGallery ? tApps("emptyTitle") : tW("emptyTitle");
  const hint = isGallery
    ? tApps("emptyHint")
    : tW(hintOnly ? "emptyHintMobile" : "emptyHint");
  const actionLabel = isGallery
    ? submitting
      ? tApps("creatingApp")
      : tApps("createApp")
    : tW("addBlock");

  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col items-center justify-center px-6 py-16 text-center",
        !hintOnly && "rounded-2xl border border-dashed",
        className
      )}
      style={{
        borderColor: hintOnly ? undefined : "var(--border-color)",
        background: hintOnly ? undefined : "var(--surface-card)",
        minHeight: hintOnly ? undefined : "min(520px, calc(100vh - 11rem))"
      }}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ background: "rgba(79,70,229,0.12)" }}
      >
        <LayoutGrid size={22} style={{ color: "#818cf8" }} />
      </div>
      <h3 className="font-heading text-base font-semibold" style={{ color: "var(--text-main)" }}>
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm" style={{ color: "var(--text-dim)" }}>
        {hint}
      </p>
      {onAction && !hintOnly && !actionDisabled ? (
        <button
          type="button"
          onClick={onAction}
          disabled={submitting}
          className="mt-5 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: "var(--accent-primary, #4f46e5)" }}
        >
          <Plus size={16} />
          {actionLabel}
        </button>
      ) : null}
      {actionDisabled ? (
        <p className="mt-6 text-sm" style={{ color: "var(--text-dimmer)" }}>
          {tApps("appLimitReached")}
        </p>
      ) : null}
    </div>
  );
}
