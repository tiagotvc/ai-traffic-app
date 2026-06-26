"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { CAMPAIGN_PRESETS } from "@/lib/campaign-presets";
import { campaignPresetBadgeClass } from "@/lib/campaign-preset-badge";
import { campaignPresetCode } from "@/lib/campaign-table-premium";
import { cn } from "@/lib/cn";
import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";
import type { CampaignTypeDto } from "@/hooks/useCampaignTypes";

export function CampaignTypeSelectCompact({
  value,
  customTypes,
  onChange
}: {
  value: string;
  customTypes: CampaignTypeDto[];
  onChange: (preset: string) => void;
}) {
  const t = useTranslations("campaignTypes");
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useDismissOnOutsideClick(ref, open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const customName = value.startsWith("custom:")
    ? customTypes.find((ct) => `custom:${ct.id}` === value)?.name
    : undefined;

  const label = value.startsWith("custom:")
    ? (customName ?? t("customTypes"))
    : t(value as "default");

  const abbrev = campaignPresetCode(value, customName);
  const showExpanded = open || hovered;

  function pick(preset: string) {
    onChange(preset);
    setOpen(false);
  }

  function renderOption(preset: string, optionLabel: string) {
    const selected = value === preset;
    const code = campaignPresetCode(
      preset,
      preset.startsWith("custom:") ? optionLabel : undefined
    );
    return (
      <button
        key={preset}
        type="button"
        onClick={() => pick(preset)}
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
          selected ? "ui-campaign-type-option--selected" : "ui-campaign-type-option"
        )}
      >
        <span className={cn("ui-campaign-table-tipo ui-campaign-table-tipo--xs", campaignPresetBadgeClass(preset))}>
          {code}
        </span>
        <span className="truncate">{optionLabel}</span>
      </button>
    );
  }

  return (
    <div
      ref={ref}
      className="relative mx-auto flex min-h-[1.75rem] items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "ui-campaign-type-trigger",
          showExpanded && "ui-campaign-type-trigger--open",
          !showExpanded && cn("ui-campaign-table-tipo", campaignPresetBadgeClass(value))
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={label}
      >
        {showExpanded ? (
          <>
            <span className="max-w-[7rem] truncate">{label}</span>
            <ChevronDown size={12} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
          </>
        ) : (
          abbrev
        )}
      </button>

      {open ? (
        <div className="ui-campaign-type-menu" role="listbox">
          {CAMPAIGN_PRESETS.map((p) => renderOption(p, t(p)))}
          {customTypes.length ? (
            <>
              <div className="ui-campaign-type-menu__heading">{t("customTypes")}</div>
              {customTypes.map((ct) =>
                renderOption(`custom:${ct.id}`, ct.name)
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
