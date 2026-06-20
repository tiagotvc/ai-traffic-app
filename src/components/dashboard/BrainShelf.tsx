"use client";

import { useState } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

type Suggestion = {
  id: string;
  type: "opportunity" | "alert" | "suggestion";
  title: string;
  body: string;
  action: string;
  actionHref?: string;
  confidence: number;
  color: string;
  border: string;
};

export function BrainShelf({ suggestions }: { suggestions?: Suggestion[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  if (!suggestions?.length) return null;
  const visible = suggestions.filter((s) => !dismissed.includes(s.id));

  if (visible.length === 0) return null;

  return (
    <div className="ui-brain-shelf w-full">
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "rgba(245,166,35,0.15)" }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="#f5a623" strokeWidth={1.75}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-heading text-sm font-semibold" style={{ color: "var(--text-main)" }}>
            Agency Brain
          </h3>
          <p className="text-[11px]" style={{ color: "var(--text-dimmer)" }}>
            {visible.length} sugestão{visible.length !== 1 ? "ões" : ""} · IA Generativa
          </p>
        </div>
        <span
          className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: "rgba(124,58,237,0.15)", color: "#7c3aed" }}
        >
          LIVE
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {visible.map((s, i) => (
          <div
            key={s.id}
            className="group relative animate-fade-up cursor-pointer rounded-xl p-3 transition-all"
            style={{
              background: "var(--surface-card)",
              border: `1px solid ${s.border}`,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              animationDelay: `${i * 80}ms`,
              animationFillMode: "both"
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${s.color}22`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
            }}
          >
            <button
              type="button"
              onClick={() => setDismissed([...dismissed, s.id])}
              className="absolute right-2 top-2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: "var(--text-dimmer)" }}
              aria-label="Dismiss"
            >
              <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <p className="font-heading text-xs font-semibold leading-tight" style={{ color: "var(--text-main)" }}>
              {s.title}
            </p>
            <p className="mb-2.5 mt-2 pr-4 text-[11px] leading-relaxed" style={{ color: "var(--text-dim)" }}>
              {s.body}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div
                  className="h-1 w-16 overflow-hidden rounded-full"
                  style={{ background: "var(--border-color)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.confidence}%`, background: s.color }}
                  />
                </div>
                <span className="text-[10px]" style={{ color: "var(--text-dimmer)" }}>
                  {s.confidence}% conf.
                </span>
              </div>
              {s.actionHref ? (
                <Link
                  href={s.actionHref}
                  className="flex items-center gap-0.5 text-[11px] font-semibold transition-all hover:gap-1.5"
                  style={{ color: s.color, fontFamily: "var(--font-heading)" }}
                >
                  {s.action}
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <span className="text-[11px] font-semibold" style={{ color: s.color }}>
                  {s.action}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
