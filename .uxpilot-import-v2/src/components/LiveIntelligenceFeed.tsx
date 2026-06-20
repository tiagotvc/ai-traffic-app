import { useState } from "react";
import { AlertTriangle, TrendingUp, Info, Zap, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const alerts = [
  {
    id: 1,
    type: "critical",
    icon: AlertTriangle,
    title: "Budget Esgotando",
    detail: "NovaMarca SA · Retargeting",
    time: "2min atrás",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    pulse: true,
  },
  {
    id: 2,
    type: "win",
    icon: TrendingUp,
    title: "ROAS > 6× detectado",
    detail: "TechVision · Prospecting",
    time: "8min atrás",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    pulse: false,
  },
  {
    id: 3,
    type: "info",
    icon: Zap,
    title: "Frequência Alta",
    detail: "BrandForce · Awareness",
    time: "15min atrás",
    color: "#f5a623",
    bg: "rgba(245,166,35,0.08)",
    pulse: false,
  },
  {
    id: 4,
    type: "info",
    icon: Info,
    title: "Novo Criativo Aprovado",
    detail: "DigitalPrime · Conversão",
    time: "32min atrás",
    color: "#4f46e5",
    bg: "rgba(79,70,229,0.08)",
    pulse: false,
  },
  {
    id: 5,
    type: "win",
    icon: TrendingUp,
    title: "CPL caiu -18%",
    detail: "TechVision · Lookalike",
    time: "1h atrás",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    pulse: false,
  },
  {
    id: 6,
    type: "critical",
    icon: AlertTriangle,
    title: "Ad Set Pausado",
    detail: "NovaMarca · Conversão",
    time: "2h atrás",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    pulse: false,
  },
  {
    id: 7,
    type: "info",
    icon: Clock,
    title: "Relatório Semanal Pronto",
    detail: "Todos os Clientes",
    time: "3h atrás",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.06)",
    pulse: false,
  },
];

interface Props {
  isEmptyState?: boolean;
}

export default function LiveIntelligenceFeed({ isEmptyState }: Props) {
  const [filter, setFilter] = useState<"all" | "critical" | "win">("all");

  const filtered = alerts.filter((a) => filter === "all" || a.type === filter);

  if (isEmptyState) {
    return (
      <div className="h-full flex flex-col">
        <div className="skeleton-shimmer h-4 w-36 rounded mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-2 mb-3">
            <div className="skeleton-shimmer w-7 h-7 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <div className="skeleton-shimmer h-3 w-3/4 rounded mb-1.5" />
              <div className="skeleton-shimmer h-2 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <h3 className="font-heading font-semibold text-sm" style={{ color: "var(--text-main)" }}>Live Intelligence</h3>
        </div>
        <span className="text-[10px] font-body" style={{ color: "var(--text-dimmer)" }}>{alerts.length} eventos</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 flex-shrink-0">
        {[
          { key: "all", label: "Todos" },
          { key: "critical", label: "Alertas" },
          { key: "win", label: "Wins" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={cn(
              "flex-1 py-1 rounded-md text-[11px] font-body font-medium transition-all"
            )}
            style={filter === tab.key
              ? { background: "rgba(245,166,35,0.12)", color: "#d97706", border: "1px solid rgba(245,166,35,0.25)" }
              : { color: "var(--text-dimmer)", border: "1px solid transparent" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}>
        {filtered.map((alert, i) => (
          <div
            key={alert.id}
            className="flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all group animate-slide-in"
            style={{
              background: alert.bg,
              border: `1px solid ${alert.color}18`,
              animationDelay: `${i * 60}ms`,
              animationFillMode: "both",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${alert.color}35`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = `${alert.color}18`; }}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                alert.pulse && "animate-pulse-red"
              )}
              style={{ background: `${alert.color}18` }}
            >
              <alert.icon size={13} style={{ color: alert.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-heading font-semibold leading-tight truncate" style={{ color: "var(--text-main)" }}>{alert.title}</p>
              <p className="text-[11px] font-body truncate mt-0.5" style={{ color: "var(--text-dim)" }}>{alert.detail}</p>
              <p className="text-[10px] font-body mt-1" style={{ color: "var(--text-dimmer)" }}>{alert.time}</p>
            </div>
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" style={{ color: "var(--text-dimmer)" }} />
          </div>
        ))}
      </div>

      {/* Footer */}
      <button
        className="mt-3 w-full py-2 rounded-xl text-xs font-body text-center transition-all flex-shrink-0 hover:opacity-80"
        style={{ color: "var(--text-dim)", border: "1px solid var(--border-color)", background: "var(--surface-bg)" }}
      >
        Ver todos os alertas →
      </button>
    </div>
  );
}