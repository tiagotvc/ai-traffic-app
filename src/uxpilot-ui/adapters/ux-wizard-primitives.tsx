"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { Link } from "@/i18n/navigation";

export function UxCircularProgress({ value }: { value: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border-color)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#f5a623"
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute font-heading text-base font-bold" style={{ color: "var(--amber)" }}>
        {value}
      </span>
    </div>
  );
}

export function UxScoreItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-all"
        style={{
          background: done ? "rgba(16,185,129,0.12)" : "var(--surface-bg)",
          border: `1.5px solid ${done ? "#10b981" : "var(--border-hover)"}`
        }}
      >
        {done ? <Check size={9} style={{ color: "#10b981" }} strokeWidth={3} /> : null}
      </div>
      <span className="font-body text-xs" style={{ color: done ? "var(--text-main)" : "var(--text-dimmer)" }}>
        {label}
      </span>
    </div>
  );
}

export function UxFormCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)"
      }}
    >
      {children}
    </div>
  );
}

export function UxStepItem({
  active,
  completed,
  onClick,
  stepNum,
  label,
  sublabel,
  disabled
}: {
  active: boolean;
  completed: boolean;
  onClick: () => void;
  stepNum: number;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group relative flex w-full items-start gap-3 px-1 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div
        className="z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-all"
        style={{
          background: completed ? "rgba(245,166,35,0.12)" : active ? "#f5a623" : "var(--surface-bg)",
          border: completed || active ? "2px solid #f5a623" : "2px solid var(--border-color)",
          boxShadow: active ? "0 0 0 4px rgba(245,166,35,0.12)" : "none"
        }}
      >
        {completed ? (
          <Check size={13} style={{ color: "#f5a623" }} strokeWidth={2.5} />
        ) : (
          <span style={{ color: active ? "#0f1419" : "var(--text-dimmer)", fontSize: 11, fontWeight: 700 }}>
            {stepNum}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 pt-1.5">
        <p
          className="truncate font-heading text-sm font-semibold leading-tight"
          style={{ color: active ? "var(--amber)" : completed ? "var(--text-main)" : "var(--text-dim)" }}
        >
          {label}
        </p>
        {sublabel ? (
          <p className="mt-0.5 truncate font-body text-[11px]" style={{ color: "var(--text-dimmer)" }}>
            {sublabel}
          </p>
        ) : null}
      </div>
    </button>
  );
}

export function UxWizardHeader({
  breadcrumbParent,
  breadcrumbParentHref,
  breadcrumbCurrent,
  title,
  onBack,
  showBack = true
}: {
  breadcrumbParent: string;
  breadcrumbParentHref: string;
  breadcrumbCurrent: string;
  title: string;
  onBack: () => void;
  showBack?: boolean;
}) {
  return (
    <div
      className="sticky top-0 z-20 flex w-full items-center gap-3 border-b px-6 py-3"
      style={{
        background: "var(--surface-card)",
        borderColor: "var(--border-color)",
        boxShadow: "0 1px 0 var(--border-color)"
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
          <Link href={breadcrumbParentHref} className="hover:underline" style={{ color: "var(--text-dimmer)" }}>
            {breadcrumbParent}
          </Link>
          {" › "}
          <span style={{ color: "var(--text-dim)" }}>{breadcrumbCurrent}</span>
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <h1 className="font-heading text-xl font-bold" style={{ color: "var(--text-main)" }}>
            {title}
          </h1>
          <span
            className="rounded px-2 py-0.5 font-heading text-xs font-semibold"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "var(--amber)",
              border: "1px solid rgba(245,166,35,0.3)"
            }}
          >
            Rascunho
          </span>
        </div>
      </div>
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border px-4 py-1.5 font-heading text-sm font-semibold transition-all hover:opacity-80"
          style={{ borderColor: "var(--border-hover)", color: "var(--text-main)", background: "var(--surface-card)" }}
        >
          Voltar
        </button>
      ) : null}
    </div>
  );
}
