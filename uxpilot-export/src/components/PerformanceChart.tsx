import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const allData = [
  { day: "01/Jun", spend: 4200, cpl: 22, roas: 3.8, ctr: 2.1 },
  { day: "05/Jun", spend: 5800, cpl: 20, roas: 4.0, ctr: 2.3 },
  { day: "10/Jun", spend: 6100, cpl: 19, roas: 4.1, ctr: 2.4 },
  { day: "15/Jun", spend: 7200, cpl: 18.5, roas: 4.3, ctr: 2.6 },
  { day: "20/Jun", spend: 8800, cpl: 19, roas: 4.2, ctr: 2.5 },
  { day: "25/Jun", spend: 9500, cpl: 18, roas: 4.5, ctr: 2.8 },
  { day: "30/Jun", spend: 11200, cpl: 17.5, roas: 4.6, ctr: 2.9 },
  { day: "05/Jul", spend: 10800, cpl: 18.2, roas: 4.5, ctr: 2.75 },
  { day: "10/Jul", spend: 12500, cpl: 17.8, roas: 4.7, ctr: 3.0 },
  { day: "15/Jul", spend: 14200, cpl: 18.4, roas: 4.6, ctr: 2.9 },
  { day: "20/Jul", spend: 13800, cpl: 18.0, roas: 4.8, ctr: 2.85 },
  { day: "25/Jul", spend: 15600, cpl: 17.5, roas: 4.9, ctr: 3.1 },
  { day: "30/Jul", spend: 14280, cpl: 18.4, roas: 4.7, ctr: 2.84 },
];

const metricConfig = {
  spend: { label: "Spend (R$)", color: "#f5a623", unit: "R$" },
  cpl: { label: "CPL (R$)", color: "#4f46e5", unit: "R$" },
  roas: { label: "ROAS", color: "#10b981", unit: "×" },
  ctr: { label: "CTR (%)", color: "#7c3aed", unit: "%" },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl p-3 text-xs font-body shadow-2xl"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border-hover)", color: "var(--text-main)" }}
      >
        <p className="font-heading font-semibold mb-2" style={{ color: "var(--text-main)" }}>{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.dataKey} className="flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
            {metricConfig[entry.dataKey as keyof typeof metricConfig]?.label}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

interface Props {
  isEmptyState?: boolean;
}

export default function PerformanceChart({ isEmptyState }: Props) {
  const [activeMetrics, setActiveMetrics] = useState<string[]>(["spend", "roas"]);
  const [showModal, setShowModal] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const toggleMetric = (key: string) => {
    setActiveMetrics((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
    setAnimKey((k) => k + 1);
  };

  if (isEmptyState) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="skeleton-shimmer h-4 w-40 rounded mb-2" />
            <div className="skeleton-shimmer h-3 w-24 rounded" />
          </div>
          <div className="skeleton-shimmer h-8 w-8 rounded-lg" />
        </div>
        <div className="flex-1 skeleton-shimmer rounded-xl" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h3 className="font-heading font-semibold" style={{ color: "var(--text-main)" }}>Performance Overview</h3>
          <p className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>Últimos 30 dias · Atualizado há 4min</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="p-2 rounded-lg transition-all hover:opacity-80"
          style={{ border: "1px solid var(--border-hover)", background: "var(--surface-bg)" }}
          title="Configurar métricas"
        >
          <Settings2 size={16} style={{ color: "var(--text-dim)" }} />
        </button>
      </div>

      {/* Active Metric Chips */}
      <div className="flex flex-wrap gap-1.5 mb-3 flex-shrink-0">
        {Object.entries(metricConfig).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => toggleMetric(key)}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-body font-medium transition-all",
              activeMetrics.includes(key) ? "" : "opacity-40 hover:opacity-70"
            )}
            style={activeMetrics.includes(key) ? {
              background: `${cfg.color}18`,
              border: `1px solid ${cfg.color}45`,
              color: cfg.color,
            } : { border: "1px solid var(--border-color)", color: "var(--text-dimmer)" }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: activeMetrics.includes(key) ? cfg.color : "var(--text-dimmer)" }} />
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 animate-chart-grow" key={animKey}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={allData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              {Object.entries(metricConfig).map(([key, cfg]) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis
              dataKey="day"
              tick={{ fill: "var(--text-dimmer)", fontSize: 10, fontFamily: "DM Sans" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-dimmer)", fontSize: 10, fontFamily: "DM Sans" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {activeMetrics.map((key) => {
              const cfg = metricConfig[key as keyof typeof metricConfig];
              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={cfg.color}
                  strokeWidth={2.5}
                  fill={`url(#grad-${key})`}
                  dot={false}
                  activeDot={{ r: 4, fill: cfg.color, strokeWidth: 0 }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Metric Config Modal */}
      {showModal && (
        <div className="absolute inset-0 flex items-center justify-center z-50 rounded-xl"
          style={{ backdropFilter: "blur(6px)", backgroundColor: "color-mix(in srgb, var(--surface-bg) 80%, transparent)" }}>
          <div
            className="w-72 rounded-2xl p-5 shadow-2xl"
            style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)" }}
          >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-heading font-semibold text-sm" style={{ color: "var(--text-main)" }}>Configurar Métricas</h4>
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:opacity-70 transition-opacity">
                  <X size={16} style={{ color: "var(--text-dim)" }} />
                </button>
              </div>
              <div className="space-y-2">
                {Object.entries(metricConfig).map(([key, cfg]) => {
                  const isChecked = activeMetrics.includes(key);
                  return (
                    <label key={key} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg transition-colors"
                      style={{ color: "var(--text-main)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      {/* Custom checkbox */}
                      <div
                        onClick={() => toggleMetric(key)}
                        className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                        style={{
                          borderColor: isChecked ? cfg.color : "var(--border-hover)",
                          background: isChecked ? cfg.color : "transparent",
                        }}
                      >
                        {isChecked && (
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                      <span className="text-sm font-body" style={{ color: "var(--text-main)" }}>{cfg.label}</span>
                    </label>
                  );
                })}
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="mt-4 w-full py-2 rounded-xl text-sm font-heading font-semibold transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419" }}
              >
                Aplicar
              </button>
          </div>
        </div>
      )}
    </div>
  );
}