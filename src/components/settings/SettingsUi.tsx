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
    default: "border-slate-200",
    danger: "border-rose-200",
    amber: "border-amber-200/80"
  };

  return (
    <section className={`rounded-xl border bg-white p-4 shadow-sm ${borders[accent]}`}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p> : null}
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
      {message ? <p className="mt-2 text-[11px] text-slate-500">{message}</p> : null}
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
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
