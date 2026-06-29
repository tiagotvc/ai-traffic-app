"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Gauge,
  PauseCircle,
  RefreshCw,
  TrendingUp,
  Users,
  type LucideIcon
} from "lucide-react";

type PerformanceAction = "scale" | "pause" | "swap_creative" | "adjust_audience" | "keep";

type ReadoutItem = {
  action: PerformanceAction;
  title: string;
  body: string;
  confidence: number;
};

type Readout = {
  summary?: string;
  confidence?: number;
  windowDays?: number;
  totalSpend?: number;
  items: ReadoutItem[];
};

const ACTION_META: Record<PerformanceAction, { icon: LucideIcon; color: string; label: string }> = {
  scale: { icon: TrendingUp, color: "#10b981", label: "Escalar" },
  pause: { icon: PauseCircle, color: "#ef4444", label: "Pausar" },
  swap_creative: { icon: RefreshCw, color: "#f5a623", label: "Trocar criativo" },
  adjust_audience: { icon: Users, color: "#38bdf8", label: "Ajustar público" },
  keep: { icon: Check, color: "#94a3b8", label: "Manter" }
};

/**
 * Card do Performance Scientist no Agency Brain: readout executivo da performance
 * real (escalar/pausar/trocar/ajustar) por IA. Read-only. Some quando desligado/sem dados.
 */
export function PerformanceReadoutCard({ clientId }: { clientId: string }) {
  const [readout, setReadout] = useState<Readout | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    setLoading(true);
    setReadout(null);
    fetch("/api/labs/performance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientSlug: clientId })
    })
      .then((r) => r.json())
      .then((j) => {
        if (active && j?.ok) setReadout(j.readout as Readout);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clientId]);

  if (!loading && (!readout || !readout.items.length)) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--creator-card-border,var(--border-color))]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 px-4 py-2.5 text-left"
      >
        <Gauge size={16} className={`text-white ${loading ? "animate-pulse" : ""}`} aria-hidden />
        <span className="text-xs font-semibold text-white">Performance Scientist</span>
        {readout?.windowDays ? (
          <span className="text-[10px] text-white/80">· últimos {readout.windowDays} dias</span>
        ) : null}
        {readout?.confidence != null ? (
          <span className="ml-auto text-[10px] font-semibold text-white/90">
            confiança {readout.confidence}%
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-white/90">
            {loading ? "analisando…" : ""}
          </span>
        )}
        {expanded ? (
          <ChevronUp size={14} className="text-white/90" aria-hidden />
        ) : (
          <ChevronDown size={14} className="text-white/90" aria-hidden />
        )}
      </button>

      {expanded ? (
        <div className="px-4 py-3">
          {loading && !readout ? (
            <p className="text-xs text-[var(--text-dim)]">Lendo a performance real das campanhas…</p>
          ) : readout ? (
            <>
              {readout.summary ? (
                <p className="text-xs leading-relaxed text-[var(--text-main)]">{readout.summary}</p>
              ) : null}
              <div className="mt-2.5 space-y-2">
                {readout.items.map((it, i) => {
                  const meta = ACTION_META[it.action] ?? ACTION_META.keep;
                  const Icon = meta.icon;
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[10px] font-semibold text-white"
                        style={{ background: meta.color }}
                      >
                        <Icon size={11} aria-hidden />
                        {meta.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[var(--text-main)]">
                          {it.title}
                          <span className="ml-1 text-[10px] font-normal text-[var(--text-dimmer)]">
                            · {it.confidence}%
                          </span>
                        </p>
                        <p className="text-[11px] leading-snug text-[var(--text-dim)]">{it.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2.5 text-[10px] text-[var(--text-dimmer)]">
                Análise da performance real (read-only) — não altera seus aprendizados/hipóteses.
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
