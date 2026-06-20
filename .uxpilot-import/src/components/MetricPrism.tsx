import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SparklineChart } from "./SparklineChart";

const primaryKPIs = [
  {
    label: "Total Spend",
    value: "R$142.8K",
    change: "+12.4%",
    trend: "up",
    color: "#f5a623",
    sparkData: [42, 58, 51, 67, 72, 65, 80, 88, 79, 95, 102, 112, 118, 142],
    subLabel: "vs. período anterior",
  },
  {
    label: "CPL Médio",
    value: "R$18.40",
    change: "-8.2%",
    trend: "up",
    color: "#10b981",
    sparkData: [32, 28, 30, 27, 25, 24, 22, 21, 20, 19.5, 19, 18.8, 18.5, 18.4],
    subLabel: "Meta: R$20.00",
  },
  {
    label: "ROAS",
    value: "4.7×",
    change: "+0.6×",
    trend: "up",
    color: "#4f46e5",
    sparkData: [3.2, 3.5, 3.4, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.5, 4.6, 4.7],
    subLabel: "Benchmark: 3.5×",
  },
];

const secondaryMetrics = [
  { label: "CPM", value: "R$24.10", change: "+3.1%", trend: "down" },
  { label: "CTR", value: "2.84%", change: "+0.3pp", trend: "up" },
  { label: "Impressões", value: "5.9M", change: "+18%", trend: "up" },
  { label: "Cliques", value: "167K", change: "+21%", trend: "up" },
  { label: "Conversões", value: "7,762", change: "+14%", trend: "up" },
];

interface Props {
  isEmptyState?: boolean;
}

export default function MetricPrism({ isEmptyState }: Props) {
  if (isEmptyState) {
    return (
      <div className="space-y-3">
        {/* Skeleton Primary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl p-5 border"
              style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
            >
              <div className="skeleton-shimmer h-3 w-20 rounded mb-4" />
              <div className="skeleton-shimmer h-10 w-32 rounded mb-2" />
              <div className="skeleton-shimmer h-2 w-full rounded mb-3" />
              <div className="skeleton-shimmer h-12 w-full rounded" />
            </div>
          ))}
        </div>
        {/* Skeleton Secondary */}
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-shimmer h-9 w-28 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {primaryKPIs.map((kpi, i) => (
          <div
            key={kpi.label}
            className="rounded-2xl p-5 kpi-card-hover cursor-default animate-fade-up"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              animationDelay: `${i * 100}ms`,
              animationFillMode: "both",
            }}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs font-body uppercase tracking-widest" style={{ color: "var(--text-dimmer)" }}>
                {kpi.label}
              </span>
              <TrendBadge change={kpi.change} trend={kpi.trend} />
            </div>

            <div
              className="font-heading font-bold leading-none mt-2 mb-1"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: kpi.color }}
            >
              {kpi.value}
            </div>

            <p className="text-[11px] mb-3" style={{ color: "var(--text-dim)" }}>{kpi.subLabel}</p>

            {/* Sparkline */}
            <div className="h-12 w-full">
              <SparklineChart data={kpi.sparkData} color={kpi.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Metrics — Chips */}
      <div className="flex flex-wrap gap-2">
        {secondaryMetrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors cursor-default"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <span className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>{m.label}</span>
            <span className="text-sm font-heading font-semibold" style={{ color: "var(--text-main)" }}>{m.value}</span>
            <TrendBadge change={m.change} trend={m.trend} small />
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendBadge({ change, trend, small }: { change: string; trend: string; small?: boolean }) {
  const isUp = trend === "up";
  const isNeutral = trend === "neutral";
  const color = isNeutral ? "#94a3b8" : isUp ? "#10b981" : "#ef4444";
  const Icon = isNeutral ? Minus : isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "flex items-center gap-0.5 rounded font-body font-medium",
        small ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
      )}
      style={{ background: `${color}15`, color }}
    >
      <Icon size={small ? 9 : 11} />
      {change}
    </span>
  );
}