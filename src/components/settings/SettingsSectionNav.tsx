"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

export type SettingsNavItem<T extends string> = {
  value: T;
  label: string;
  description: string;
  icon: LucideIcon;
};

function SettingsNavButton<T extends string>({
  item,
  selected,
  onChange,
  compact
}: {
  item: SettingsNavItem<T>;
  selected: boolean;
  onChange: (value: T) => void;
  compact?: boolean;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      title={compact ? item.description : undefined}
      onClick={() => onChange(item.value)}
      className={cn(
        "settings-nav-item group tab-transition",
        selected && "settings-nav-item--active",
        compact ? "shrink-0 px-2.5 py-2" : "w-full px-3 py-2.5 text-[13px]"
      )}
    >
      <span className="settings-nav-item__icon" aria-hidden>
        <Icon size={compact ? 15 : 16} strokeWidth={1.75} />
      </span>
      <span className="settings-nav-item__text min-w-0">
        <span className="settings-nav-item__label block truncate text-[13px] font-medium leading-tight">
          {item.label}
        </span>
        {!compact && item.description ? (
          <span className="settings-nav-item__desc mt-0.5 line-clamp-2">{item.description}</span>
        ) : null}
      </span>
    </button>
  );
}

export function SettingsSectionNav<T extends string>({
  items,
  active,
  onChange,
  ariaLabel
}: {
  items: SettingsNavItem<T>[];
  active: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <nav className="settings-section-nav" aria-label={ariaLabel}>
      <div
        className="settings-section-nav__list settings-section-nav__list--mobile -mx-1 flex gap-0.5 overflow-x-auto pb-0.5 lg:hidden"
        role="tablist"
      >
        {items.map((item) => (
          <SettingsNavButton
            key={item.value}
            item={item}
            selected={active === item.value}
            onChange={onChange}
            compact
          />
        ))}
      </div>

      <div
        className="settings-section-nav__list settings-section-nav__list--desktop hidden flex-col gap-0.5 lg:flex"
        role="tablist"
      >
        {items.map((item) => (
          <SettingsNavButton
            key={item.value}
            item={item}
            selected={active === item.value}
            onChange={onChange}
          />
        ))}
      </div>
    </nav>
  );
}
