"use client";

import type { ReactNode } from "react";

export function SettingsSection({
  title,
  subtitle,
  children,
  accent = "default"
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: "default" | "danger" | "amber";
}) {
  const borders = {
    default: "border-[var(--border-color)]",
    danger: "border-[rgba(239,68,68,0.25)]",
    amber: "border-[rgba(245,166,35,0.25)]"
  };

  return (
    <section className={`ui-card p-4 ${borders[accent]}`}>
      <div className="mb-3">
        <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[11px] text-[var(--text-dimmer)]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsSaveRow({
  children,
  message
}: {
  children: ReactNode;
  message?: string | null;
}) {
  return (
    <div>
      <div className="flex justify-end">{children}</div>
      {message ? <p className="mt-2 text-[11px] text-[var(--text-dimmer)]">{message}</p> : null}
    </div>
  );
}

export function SettingsField({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="ui-label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
