"use client";

import { useState } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export type IntelligenceEvent = {
  id: string;
  type: "critical" | "win" | "info";
  title: string;
  detail: string;
  time: string;
  color: string;
  bg: string;
  pulse?: boolean;
  href?: string;
};

export function LiveIntelligenceFeed({
  events,
  isLoading
}: {
  events: IntelligenceEvent[];
  isLoading?: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "critical" | "win">("all");
  const filtered = events.filter((a) => filter === "all" || a.type === filter);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="skeleton-shimmer mb-4 h-4 w-36 rounded" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mb-3 flex gap-2">
            <div className="skeleton-shimmer h-7 w-7 shrink-0 rounded-lg" />
            <div className="flex-1">
              <div className="skeleton-shimmer mb-1.5 h-3 w-3/4 rounded" />
              <div className="skeleton-shimmer h-2 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
          <h3 className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Live Intelligence
          </h3>
        </div>
        <span className="text-[10px]" style={{ color: "var(--text-dimmer)" }}>
          {events.length} eventos
        </span>
      </div>

      <div className="mb-3 flex shrink-0 gap-1">
        {(
          [
            ["all", "Todos"],
            ["critical", "Alertas"],
            ["win", "Wins"]
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className="flex-1 rounded-md py-1 text-[11px] font-medium transition-all"
            style={
              filter === key
                ? {
                    background: "rgba(245,166,35,0.12)",
                    color: "#d97706",
                    border: "1px solid rgba(245,166,35,0.25)"
                  }
                : { color: "var(--text-dimmer)", border: "1px solid transparent" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="flex flex-1 flex-col gap-3 overflow-y-auto pr-0.5"
        style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
      >
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs" style={{ color: "var(--text-dim)" }}>
            Nenhum evento no período
          </p>
        ) : null}
        {filtered.map((alert, i) => {
          const inner = (
            <div
              className={cn(
                "group flex animate-slide-in cursor-pointer items-start gap-2.5 rounded-xl p-2.5 transition-all",
                alert.pulse && "animate-pulse-red"
              )}
              style={{
                background: alert.bg,
                border: `1px solid ${alert.color}18`,
                animationDelay: `${i * 60}ms`,
                animationFillMode: "both"
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${alert.color}35`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${alert.color}18`;
              }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${alert.color}18` }}
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={alert.color}
                  strokeWidth={2}
                >
                  {alert.type === "win" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  ) : alert.type === "critical" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  )}
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-xs font-semibold leading-tight"
                  style={{ color: "var(--text-main)", fontFamily: "var(--font-heading)" }}
                >
                  {alert.title}
                </p>
                <p className="mt-0.5 truncate text-[11px]" style={{ color: "var(--text-dim)" }}>
                  {alert.detail}
                </p>
                <p className="mt-1 text-[10px]" style={{ color: "var(--text-dimmer)" }}>
                  {alert.time}
                </p>
              </div>
              <svg
                className="mt-1 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{ color: "var(--text-dimmer)" }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          );

          return alert.href ? (
            <Link key={alert.id} href={alert.href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={alert.id} className="block">
              {inner}
            </div>
          );
        })}
      </div>

      <Link
        href="/alerts"
        className="mt-3 w-full shrink-0 rounded-xl py-2 text-center text-xs transition-all hover:opacity-80"
        style={{
          color: "var(--text-dim)",
          border: "1px solid var(--border-color)",
          background: "var(--surface-bg)"
        }}
      >
        Ver todos os alertas →
      </Link>
    </div>
  );
}
