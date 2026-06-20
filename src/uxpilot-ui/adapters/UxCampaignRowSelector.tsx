"use client";

import { cn } from "@/uxpilot-ui/lib/utils";

export function UxCampaignRowSelector({
  selected,
  disabled,
  onClick
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={selected ? "Desmarcar campanha" : "Selecionar campanha"}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
        selected ? "border-[var(--amber)]" : "border-[var(--border-color)]",
        disabled && "cursor-wait opacity-60"
      )}
    >
      <span
        className={cn(
          "rounded-full transition-all",
          selected ? "h-2.5 w-2.5 bg-[var(--amber)]" : "h-2 w-2 bg-[#05080c]"
        )}
      />
    </button>
  );
}
