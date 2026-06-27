"use client";

import { useState } from "react";
import { useUxNavigate as useNavigate } from "@/uxpilot-ui/adapters/navigation";
import Sidebar from "@/uxpilot-ui/components/Sidebar";
import CommandStrip from "@/uxpilot-ui/components/CommandStrip";
import {
  Search,
  Filter,
  Play,
  Pause,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Plus,
  ChevronDown,
  BarChart2,
  Eye,
  MousePointerClick,
  DollarSign,
  Zap,
  Copy,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/uxpilot-ui/lib/utils";

const campaigns = [
  {
    id: 1,
    name: "TechVision — Conversão LAL",
    client: "TechVision Ltda",
    objective: "Conversões",
    status: "active",
    spend: "R$18.240",
    roas: "5.2×",
    cpl: "R$14,20",
    ctr: "3,2%",
    impressions: "1,2M",
    clicks: "38.400",
    conversions: "1.284",
    frequency: "2,4",
    cpm: "R$15,20",
    budget: "R$800/dia",
    trend: "up",
    trendPct: "+12%",
  },
  {
    id: 2,
    name: "BrandForce — Awareness Brand",
    client: "BrandForce Corp",
    objective: "Awareness",
    status: "active",
    spend: "R$12.800",
    roas: "3.8×",
    cpl: "R$22,40",
    ctr: "0,8%",
    impressions: "890K",
    clicks: "7.120",
    conversions: "571",
    frequency: "3,1",
    cpm: "R$14,38",
    budget: "R$500/dia",
    trend: "down",
    trendPct: "-4%",
  },
  {
    id: 3,
    name: "NovaMarca — Retargeting 30d",
    client: "NovaMarca SA",
    objective: "Retargeting",
    status: "active",
    spend: "R$9.600",
    roas: "6.1×",
    cpl: "R$11,80",
    ctr: "4,1%",
    impressions: "421K",
    clicks: "17.261",
    conversions: "813",
    frequency: "4,8",
    cpm: "R$22,80",
    budget: "R$400/dia",
    trend: "up",
    trendPct: "+23%",
  },
  {
    id: 4,
    name: "DigitalPrime — Prospecting",
    client: "DigitalPrime",
    objective: "Conversões",
    status: "active",
    spend: "R$8.240",
    roas: "4.9×",
    cpl: "R$15,60",
    ctr: "2,9%",
    impressions: "680K",
    clicks: "19.720",
    conversions: "528",
    frequency: "2,1",
    cpm: "R$12,12",
    budget: "R$350/dia",
    trend: "up",
    trendPct: "+8%",
  },
  {
    id: 5,
    name: "TechVision — Remarketing VV",
    client: "TechVision Ltda",
    objective: "Retargeting",
    status: "paused",
    spend: "R$4.200",
    roas: "7.3×",
    cpl: "R$9,80",
    ctr: "5,2%",
    impressions: "192K",
    clicks: "9.984",
    conversions: "428",
    frequency: "6,2",
    cpm: "R$21,87",
    budget: "R$200/dia",
    trend: "up",
    trendPct: "+31%",
  },
  {
    id: 6,
    name: "BrandForce — Conversão Lead",
    client: "BrandForce Corp",
    objective: "Leads",
    status: "paused",
    spend: "R$6.100",
    roas: "2.9×",
    cpl: "R$28,40",
    ctr: "1,4%",
    impressions: "316K",
    clicks: "4.424",
    conversions: "214",
    frequency: "2,8",
    cpm: "R$19,30",
    budget: "R$250/dia",
    trend: "down",
    trendPct: "-11%",
  },
  {
    id: 7,
    name: "NovaMarca — Prospecting LAL 5%",
    client: "NovaMarca SA",
    objective: "Conversões",
    status: "active",
    spend: "R$7.200",
    roas: "3.2×",
    cpl: "R$21,20",
    ctr: "2,1%",
    impressions: "540K",
    clicks: "11.340",
    conversions: "339",
    frequency: "1,9",
    cpm: "R$13,33",
    budget: "R$300/dia",
    trend: "up",
    trendPct: "+5%",
  },
  {
    id: 8,
    name: "DigitalPrime — Retargeting 7d",
    client: "DigitalPrime",
    objective: "Conversões",
    status: "active",
    spend: "R$5.100",
    roas: "8.1×",
    cpl: "R$8,40",
    ctr: "6,8%",
    impressions: "98K",
    clicks: "6.664",
    conversions: "607",
    frequency: "5,4",
    cpm: "R$52,04",
    budget: "R$220/dia",
    trend: "up",
    trendPct: "+42%",
  },
  {
    id: 9,
    name: "TechVision — Tráfego Blog",
    client: "TechVision Ltda",
    objective: "Tráfego",
    status: "active",
    spend: "R$3.800",
    roas: "2.1×",
    cpl: "R$4,20",
    ctr: "8,4%",
    impressions: "204K",
    clicks: "17.136",
    conversions: "904",
    frequency: "1,4",
    cpm: "R$18,63",
    budget: "R$160/dia",
    trend: "up",
    trendPct: "+17%",
  },
  {
    id: 10,
    name: "BrandForce — Engajamento Q2",
    client: "BrandForce Corp",
    objective: "Engajamento",
    status: "draft",
    spend: "—",
    roas: "—",
    cpl: "—",
    ctr: "—",
    impressions: "—",
    clicks: "—",
    conversions: "—",
    frequency: "—",
    cpm: "—",
    budget: "R$300/dia",
    trend: "up",
    trendPct: "",
  },
];

const objectiveColors: Record<string, string> = {
  Conversões: "#4f46e5",
  Awareness: "#f5a623",
  Retargeting: "#10b981",
  Leads: "#7c3aed",
  Tráfego: "#0ea5e9",
  Engajamento: "#f43f5e",
};

// Summary KPIs
const kpis = [
  { label: "Investimento Total", value: "R$75.280", delta: "+14%", icon: DollarSign, color: "#f5a623" },
  { label: "ROAS Médio", value: "5,1×", delta: "+0.6×", icon: TrendingUp, color: "#10b981" },
  { label: "Total de Impressões", value: "4,54M", delta: "+22%", icon: Eye, color: "#4f46e5" },
  { label: "Total de Cliques", value: "131,8K", delta: "+18%", icon: MousePointerClick, color: "#0ea5e9" },
  { label: "Conversões", value: "5.688", delta: "+31%", icon: Zap, color: "#7c3aed" },
  { label: "CPL Médio", value: "R$13,24", delta: "-8%", icon: BarChart2, color: "#ef4444" },
];

type SortKey = "spend" | "roas" | "cpl" | "ctr" | "impressions" | null;

export default function Campaigns() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "draft">("all");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = campaigns
    .filter((c) => statusFilter === "all" || c.status === statusFilter)
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.client.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-bg)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <CommandStrip onToggleEmpty={() => {}} isEmptyState={false} />

        <main
          className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>
                Campanhas
              </h1>
              <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>
                {filtered.length} de {campaigns.length} campanhas •{" "}
                {campaigns.filter((c) => c.status === "active").length} ativas
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dimmer)" }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar campanhas..."
                  className="pl-8 pr-3 py-2 rounded-lg text-sm font-body border focus:outline-none transition-colors"
                  style={{
                    background: "var(--input-bg)",
                    color: "var(--text-main)",
                    borderColor: "var(--border-color)",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--ui-accent)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
                />
              </div>

              {/* Status Filter */}
              {(["all", "active", "paused", "draft"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-3 py-2 rounded-lg text-xs font-heading font-semibold border transition-all"
                  style={
                    statusFilter === s
                      ? { background: "var(--ui-accent-muted)", borderColor: "var(--ui-accent-border)", color: "var(--ui-accent)" }
                      : { borderColor: "var(--border-color)", color: "var(--text-dim)" }
                  }
                >
                  {s === "all" ? "Todas" : s === "active" ? "Ativas" : s === "paused" ? "Pausadas" : "Rascunho"}
                </button>
              ))}

              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body border transition-all"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                <Filter size={12} />
                Filtros
              </button>

              {/* New Campaign CTA */}
              <button
                onClick={() => navigate("/campaigns/new")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-heading font-bold shadow-lg transition-all hover:brightness-110 active:scale-95"
                style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419" }}
              >
                <Plus size={15} />
                Nova Campanha
              </button>
            </div>
          </div>

          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              const isPositive = kpi.delta.startsWith("+");
              return (
                <div
                  key={kpi.label}
                  className="rounded-xl border p-3 kpi-card-hover"
                  style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                      <Icon size={14} style={{ color: kpi.color }} />
                    </div>
                    <span
                      className="text-[10px] font-heading font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isPositive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                        color: isPositive ? "#10b981" : "#ef4444",
                      }}
                    >
                      {kpi.delta}
                    </span>
                  </div>
                  <p className="font-heading font-bold text-base" style={{ color: "var(--text-main)" }}>
                    {kpi.value}
                  </p>
                  <p className="text-[10px] font-body mt-0.5" style={{ color: "var(--text-dim)" }}>
                    {kpi.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "var(--surface-thead)", borderBottom: "1px solid var(--border-color)" }}>
                    {[
                      { label: "Campanha", key: null },
                      { label: "Objetivo", key: null },
                      { label: "Status", key: null },
                      { label: "Budget", key: null },
                      { label: "Investido", key: "spend" as SortKey },
                      { label: "ROAS", key: "roas" as SortKey },
                      { label: "CPL", key: "cpl" as SortKey },
                      { label: "CTR", key: "ctr" as SortKey },
                      { label: "Impressões", key: "impressions" as SortKey },
                      { label: "Cliques", key: null },
                      { label: "Conversões", key: null },
                      { label: "Freq.", key: null },
                      { label: "CPM", key: null },
                      { label: "Ação", key: null },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className={cn(
                          "text-left px-4 py-3 text-[10px] uppercase tracking-widest font-heading whitespace-nowrap select-none",
                          h.key && "cursor-pointer hover:opacity-80"
                        )}
                        style={{ color: "var(--text-dimmer)" }}
                        onClick={() => h.key && handleSort(h.key)}
                      >
                        <div className="flex items-center gap-1">
                          {h.label}
                          {h.key && (
                            <ArrowUpDown
                              size={9}
                              className={cn(sortKey === h.key ? "opacity-100" : "opacity-30")}
                              style={{ color: sortKey === h.key ? "var(--ui-accent)" : undefined }}
                            />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr
                      key={c.id}
                      className="border-b animate-fade-up group transition-colors"
                      style={{
                        animationDelay: `${i * 35}ms`,
                        animationFillMode: "both",
                        borderColor: "var(--border-color)",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--row-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      {/* Campaign Name */}
                      <td className="px-4 py-3 min-w-[200px]">
                        <div>
                          <p className="font-body font-medium text-sm" style={{ color: "var(--text-main)" }}>
                            {c.name}
                          </p>
                          <p className="text-[11px] font-body mt-0.5" style={{ color: "var(--text-dimmer)" }}>
                            {c.client}
                          </p>
                        </div>
                      </td>

                      {/* Objective */}
                      <td className="px-4 py-3">
                        <span
                          className="text-[11px] font-body px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{
                            background: `${objectiveColors[c.objective] || "#94a3b8"}18`,
                            color: objectiveColors[c.objective] || "#94a3b8",
                          }}
                        >
                          {c.objective}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              c.status === "active"
                                ? "bg-green-400 animate-pulse"
                                : c.status === "draft"
                                ? "bg-slate-400"
                                : "bg-[var(--ui-accent)]"
                            )}
                          />
                          <span
                            className="text-xs font-body"
                            style={{
                              color:
                                c.status === "active"
                                  ? "#10b981"
                                  : c.status === "draft"
                                  ? "var(--text-dim)"
                                  : "#f5a623",
                            }}
                          >
                            {c.status === "active" ? "Ativa" : c.status === "draft" ? "Rascunho" : "Pausada"}
                          </span>
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="px-4 py-3 text-sm font-body whitespace-nowrap" style={{ color: "var(--text-dim)" }}>
                        {c.budget}
                      </td>

                      {/* Spend */}
                      <td className="px-4 py-3 font-heading font-semibold text-sm whitespace-nowrap" style={{ color: "var(--ui-accent)" }}>
                        {c.spend}
                      </td>

                      {/* ROAS */}
                      <td className="px-4 py-3">
                        {c.roas === "—" ? (
                          <span style={{ color: "var(--text-dimmer)" }}>—</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            {c.trend === "up" ? (
                              <TrendingUp size={12} style={{ color: "#10b981" }} />
                            ) : (
                              <TrendingDown size={12} style={{ color: "#ef4444" }} />
                            )}
                            <span
                              className="font-heading font-semibold text-sm"
                              style={{ color: c.trend === "up" ? "#10b981" : "#ef4444" }}
                            >
                              {c.roas}
                            </span>
                            {c.trendPct && (
                              <span
                                className="text-[10px] font-body"
                                style={{ color: c.trend === "up" ? "#10b981" : "#ef4444" }}
                              >
                                {c.trendPct}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* CPL */}
                      <td className="px-4 py-3 font-body text-sm whitespace-nowrap" style={{ color: "var(--text-main)" }}>
                        {c.cpl}
                      </td>

                      {/* CTR */}
                      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-main)" }}>
                        {c.ctr}
                      </td>

                      {/* Impressions */}
                      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                        {c.impressions}
                      </td>

                      {/* Clicks */}
                      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                        {c.clicks}
                      </td>

                      {/* Conversions */}
                      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                        {c.conversions}
                      </td>

                      {/* Frequency */}
                      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                        {c.frequency}
                      </td>

                      {/* CPM */}
                      <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-dim)" }}>
                        {c.cpm}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {c.status !== "draft" && (
                            <button
                              className="p-1.5 rounded-lg transition-colors"
                              title={c.status === "active" ? "Pausar" : "Ativar"}
                              style={{ color: c.status === "active" ? "var(--ui-accent)" : "#10b981" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "var(--border-color)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "")}
                            >
                              {c.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          )}
                          <div className="relative">
                            <button
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: "var(--text-dim)" }}
                              onClick={() => setOpenMenu(openMenu === c.id ? null : c.id)}
                              onMouseEnter={e => (e.currentTarget.style.background = "var(--border-color)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "")}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {openMenu === c.id && (
                              <div
                                className="absolute right-0 top-full mt-1 w-44 rounded-lg border shadow-xl z-50 overflow-hidden"
                                style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}
                              >
                                {[
                                  { icon: ExternalLink, label: "Ver no Meta Ads" },
                                  { icon: Copy, label: "Duplicar" },
                                  { icon: BarChart2, label: "Ver Relatório" },
                                  { icon: Trash2, label: "Excluir", danger: true },
                                ].map((item) => (
                                  <button
                                    key={item.label}
                                    onClick={() => setOpenMenu(null)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-body transition-colors"
                                    style={{ color: item.danger ? "#ef4444" : "var(--text-dim)" }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "var(--row-hover)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "")}
                                  >
                                    <item.icon size={13} />
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="font-heading font-semibold opacity-40" style={{ color: "var(--text-main)" }}>
                  Nenhuma campanha encontrada
                </p>
              </div>
            )}

            {/* Table footer */}
            <div
              className="flex items-center justify-between px-4 py-3 border-t text-xs font-body"
              style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
            >
              <span>
                Exibindo {filtered.length} de {campaigns.length} campanhas
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="px-3 py-1.5 rounded-lg border text-xs transition-colors"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
                >
                  Anterior
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg border text-xs transition-colors"
                  style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Close dropdown on outside click */}
      {openMenu !== null && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
      )}
    </div>
  );
}