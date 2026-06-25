"use client";

import { cn } from "@/lib/cn";

type DsSwitchSize = "sm" | "md";

const trackClass: Record<DsSwitchSize, string> = {
  sm: "h-[18px] w-[32px]",
  md: "h-[22px] w-[40px]"
};

const knobClass: Record<DsSwitchSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4"
};

const knobTranslate: Record<DsSwitchSize, { on: string; off: string }> = {
  sm: { on: "translateX(15px)", off: "translateX(2px)" },
  md: { on: "translateX(18px)", off: "translateX(2px)" }
};

/**
 * Switch canônico do DS. Usa os tokens `--toggle-*` (trilho on/off, knob, sombra) e é acessível
 * (`role="switch"`). Base do antigo `CampaignStatusToggle`.
 */
export function DsSwitch({
  checked,
  onChange,
  disabled,
  size = "md",
  ariaLabel,
  className
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: DsSwitchSize;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--violet)] focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-60",
        trackClass[size],
        className
      )}
      style={{
        background: checked ? "var(--toggle-track-on)" : "var(--toggle-track-off)",
        borderColor: "var(--toggle-border)"
      }}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-[2px] rounded-full transition-transform duration-200",
          knobClass[size]
        )}
        style={{
          background: "var(--toggle-knob)",
          boxShadow: "var(--toggle-knob-shadow)",
          transform: checked ? knobTranslate[size].on : knobTranslate[size].off
        }}
      />
    </button>
  );
}
