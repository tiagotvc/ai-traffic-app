"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Download, Calendar, TrendingUp, Target } from "lucide-react";

import type {
  UxClientSpend,
  UxReportKpi,
  UxReportListItem,
  UxReportMonth
} from "@/uxpilot-ui/adapters/reports-mappers";

export type ReportsLiveProps = {
  monthlyData: UxReportMonth[];
  clientSpendBreakdown: UxClientSpend[];
  reportList: UxReportListItem[];
  kpis: UxReportKpi[];
  loading?: boolean;
  onGenerate?: () => void;
  generating?: boolean;
};

const monthlyData: UxReportMonth[] = [
  { month: "Fev", spend: 98000, conversions: 5240, roas: 4.1 },
  { month: "Mar", spend: 112000, conversions: 6100, roas: 4.3 },
  { month: "Abr", spend: 125000, conversions: 6850, roas: 4.4 },
  { month: "Mai", spend: 138000, conversions: 7420, roas: 4.5 },
  { month: "Jun", spend: 142800, conversions: 7762, roas: 4.7 },
];

const clientSpendBreakdown: UxClientSpend[] = [
  { name: "TechVision", value: 36.6, color: "#4f46e5" },
  { name: "BrandForce", value: 26.7, color: "#f5a623" },
  { name: "NovaMarca", value: 20.8, color: "#10b981" },
  { name: "DigitalPrime", value: 15.9, color: "#7c3aed" },
];

const reportList: UxReportListItem[] = [
  { id: "1", name: "Relatório Semanal — Jul 14–20", date: "20 Jul, 2025", type: "Semanal", size: "2.4 MB", status: "ready" },
  { id: "2", name: "Relatório TechVision — Junho", date: "01 Jul, 2025", type: "Mensal", size: "5.1 MB", status: "ready" },
  { id: "3", name: "Análise de Audiências Q2", date: "30 Jun, 2025", type: "Trimestral", size: "8.7 MB", status: "ready" },
  { id: "4", name: "Benchmark Criativos — Jun", date: "28 Jun, 2025", type: "Custom", size: "3.2 MB", status: "ready" },
  { id: "5", name: "Relatório BrandForce — Junho", date: "01 Jul, 2025", type: "Mensal", size: "4.8 MB", status: "generating" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg p-3 text-xs font-body shadow-2xl"
        style={{ background: "#1d2630", border: "1px solid rgba(255,255,255,0.1)" }}>
        <p className="font-heading font-semibold text-white mb-2">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === "number" && entry.value > 1000
              ? `R$${(entry.value / 1000).toFixed(0)}K`
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ReportsContent({ live }: { live?: ReportsLiveProps } = {}) {
  const isLive = Boolean(live);
  const monthlyDataSource = isLive ? live!.monthlyData : monthlyData;
  const clientSpendSource = isLive ? live!.clientSpendBreakdown : clientSpendBreakdown;
  const reportListSource = isLive ? live!.reportList : reportList;
  const kpiSource = isLive
    ? live!.kpis
    : [
        { label: "Spend Total (Jun)", value: "R$142.8K", icon: Target, color: "#f5a623", sub: "+12.4% vs Mai" },
        { label: "Conversões (Jun)", value: "7,762", icon: TrendingUp, color: "#10b981", sub: "+14% vs Mai" },
        { label: "ROAS Médio (Jun)", value: "4.7×", icon: TrendingUp, color: "#4f46e5", sub: "+0.2× vs Mai" },
        { label: "CPL Médio (Jun)", value: "R$18.40", icon: Target, color: "#7c3aed", sub: "-8.2% vs Mai" },
      ];

  return (
    <main
          className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>Relatórios</h1>
              <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>Análises e exportações da agência</p>
            </div>
            <button
              type="button"
              disabled={isLive && (live?.generating || live?.loading)}
              onClick={() => live?.onGenerate?.()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-heading font-semibold transition-all hover:brightness-110 disabled:opacity-60"
              style={{ background: "#f5a623", color: "#0f1419" }}
            >
              <Calendar size={14} />
              {isLive && live?.generating ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Monthly Spend Bar Chart */}
            <div className="lg:col-span-2 rounded-xl border p-5" style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-semibold text-sm" style={{ color: "var(--text-main)" }}>Spend Mensal</h3>
                  <p className="text-xs font-body" style={{ color: "var(--text-dim)" }}>Últimos 5 meses</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-body" style={{ color: "#10b981" }}>
                  <TrendingUp size={12} />
                  +12% vs mês anterior
                </div>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyDataSource} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "DM Sans" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="spend" fill="#f5a623" radius={[4, 4, 0, 0]} opacity={0.9} name="Spend" />
                    <Bar dataKey="conversions" fill="#4f46e5" radius={[4, 4, 0, 0]} opacity={0.7} name="Conversões" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            <div className="rounded-xl border p-5 flex flex-col" style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}>
              <div className="mb-4">
                <h3 className="font-heading font-semibold text-sm" style={{ color: "var(--text-main)" }}>Distribuição de Spend</h3>
                <p className="text-xs font-body" style={{ color: "var(--text-dim)" }}>Por cliente</p>
              </div>
              <div className="flex-1" style={{ minHeight: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={clientSpendSource}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {clientSpendSource.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} opacity={0.9} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Share"]}
                      contentStyle={{ background: "#1d2630", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "DM Sans" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5">
                {clientSpendSource.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs font-body">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span style={{ color: "var(--text-dim)" }}>{item.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: "var(--text-main)" }}>{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* KPI Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpiSource.map((k, i) => (
              <div key={i} className="rounded-xl p-4 border kpi-card-hover cursor-default animate-fade-up"
                style={{ background: "var(--surface-card)", borderColor: "var(--border-color)", animationDelay: `${i * 80}ms`, animationFillMode: "both" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${k.color}15` }}>
                  <k.icon size={14} style={{ color: k.color }} />
                </div>
                <div className="font-heading font-bold text-lg" style={{ color: "var(--text-main)" }}>{k.value}</div>
                <div className="text-xs font-body" style={{ color: "var(--text-dim)" }}>{k.label}</div>
                <div className="text-[11px] font-body mt-1" style={{ color: k.color }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Report List */}
          <div className="rounded-xl border overflow-hidden" style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
              <h3 className="font-heading font-semibold text-sm" style={{ color: "var(--text-main)" }}>Relatórios Gerados</h3>
              <button className="text-xs font-body transition-colors" style={{ color: "var(--text-dim)" }}>
                Ver todos →
              </button>
            </div>
            {reportListSource.map((r, i) => (
              <div key={r.id ?? i} className="flex items-center gap-4 px-5 py-3 transition-colors group"
                style={{ borderBottom: "1px solid var(--border-color)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--row-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "")}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(245,166,35,0.1)" }}>
                  <Calendar size={14} style={{ color: "#f5a623" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-medium truncate" style={{ color: "var(--text-main)" }}>{r.name}</p>
                  <p className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>{r.date} · {r.size}</p>
                </div>
                <span className="text-[11px] font-body px-2 py-0.5 rounded-full hidden sm:inline-block"
                  style={{ background: "rgba(79,70,229,0.12)", color: "#818cf8" }}>
                  {r.type}
                </span>
                {r.status === "ready" ? (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body opacity-0 group-hover:opacity-100 transition-all border"
                    style={{ color: "var(--text-dim)", borderColor: "var(--border-hover)" }}>
                    <Download size={12} />
                    Baixar
                  </button>
                ) : (
                  <span className="text-xs font-body px-2 py-1 rounded-lg animate-pulse-amber"
                    style={{ color: "#f5a623", background: "rgba(245,166,35,0.1)" }}>
                    Gerando...
                  </span>
                )}
              </div>
            ))}
          </div>
        </main>
  );
}
