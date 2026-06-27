"use client";

import { AlertTriangle, TrendingUp, Info, Zap, CheckCircle2, Bell, Filter } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/uxpilot-ui/lib/utils";

export type UxAlertItem = {
  id: string;
  type: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  time: string;
  client: string;
  read: boolean;
  color: string;
  bg: string;
  border: string;
};

export type AlertsLiveProps = {
  alerts: UxAlertItem[];
  loading?: boolean;
};

const alertsData: UxAlertItem[] = [
  { id: "1", type: "critical", icon: AlertTriangle, title: "Budget Esgotando", detail: "NovaMarca SA · Retargeting 30d — Budget restante: 8% (R$480)", time: "2min atrás", client: "NovaMarca SA", read: false, color: "#ef4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)" },
  { id: "2", type: "critical", icon: AlertTriangle, title: "Ad Set Pausado Automaticamente", detail: "BrandForce Corp · Brand Awareness — Frequência ultrapassou 5.0", time: "18min atrás", client: "BrandForce Corp", read: false, color: "#ef4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)" },
  { id: "3", type: "win", icon: TrendingUp, title: "ROAS Recorde Detectado", detail: "TechVision · Prospecting LAL — ROAS atingiu 6.8×, acima do benchmark", time: "8min atrás", client: "TechVision Ltda", read: false, color: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.18)" },
  { id: "4", type: "win", icon: TrendingUp, title: "CPL Caiu -22%", detail: "DigitalPrime · Retargeting 7d — Melhor resultado histórico da conta", time: "45min atrás", client: "DigitalPrime", read: true, color: "#10b981", bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.18)" },
  { id: "5", type: "warning", icon: Zap, title: "Frequência Alta Detectada", detail: "BrandForce Corp · Awareness — Frequência: 4.2 (threshold: 3.5)", time: "15min atrás", client: "BrandForce Corp", read: false, color: "#f5a623", bg: "rgba(245,166,35,0.06)", border: "rgba(245,166,35,0.2)" },
  { id: "6", type: "warning", icon: Zap, title: "CTR Abaixo do Benchmark", detail: "BrandForce Corp · Conversão Lead — CTR: 0.8% (benchmark: 2.5%)", time: "1h atrás", client: "BrandForce Corp", read: true, color: "#f5a623", bg: "rgba(245,166,35,0.06)", border: "rgba(245,166,35,0.2)" },
  { id: "7", type: "info", icon: Info, title: "Novo Criativo Aprovado pela Meta", detail: "DigitalPrime · Conversão — 2 criativos aprovados e em veiculação", time: "32min atrás", client: "DigitalPrime", read: true, color: "#4f46e5", bg: "rgba(79,70,229,0.06)", border: "rgba(79,70,229,0.18)" },
  { id: "8", type: "info", icon: CheckCircle2, title: "Sincronização Concluída", detail: "Todas as 8 contas sincronizadas com sucesso · Meta Ads API", time: "1h atrás", client: "Geral", read: true, color: "#94a3b8", bg: "rgba(148,163,184,0.04)", border: "rgba(148,163,184,0.14)" },
];

const typeConfig = { critical: "Crítico", warning: "Atenção", win: "Win", info: "Info" };

export default function AlertsContent({ live }: { live?: AlertsLiveProps } = {}) {
  const isLive = Boolean(live);
  const [filter, setFilter] = useState<string>("all");
  const [readState, setReadState] = useState<string[]>([]);

  const alertsSource = isLive ? live!.alerts : alertsData;

  const markAsRead = (id: string) => {
    if (!readState.includes(id)) setReadState([...readState, id]);
  };

  const filtered = alertsSource.filter((a) => filter === "all" || a.type === filter);
  const unreadCount = alertsSource.filter((a) => !a.read && !readState.includes(a.id)).length;

  if (isLive && live?.loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          />
        ))}
      </div>
    );
  }

  const pageShellClass = isLive
    ? "w-full space-y-5"
    : "flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5";
  const PageTag = isLive ? "div" : "main";

  return (
    <PageTag
          className={pageShellClass}
          style={isLive ? undefined : { scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell size={22} style={{ color: "var(--text-main)" }} />
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold animate-pulse-red"
                    style={{ background: "#ef4444", color: "white" }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>
                  Central de Alertas
                </h1>
                <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>
                  {unreadCount} não lidos · {alertsSource.length} total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body border transition-all"
                style={{
                  color: "var(--text-dim)",
                  borderColor: "rgba(245,166,35,0.35)",
                  background: "var(--surface-card)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "rgba(245,166,35,0.6)";
                  e.currentTarget.style.background = "rgba(245,166,35,0.05)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(245,166,35,0.35)";
                  e.currentTarget.style.background = "var(--surface-card)";
                }}
              >
                <Filter size={12} />
                Filtrar
              </button>
              <button
                onClick={() => setReadState(alertsSource.map((a) => a.id))}
                className="px-3 py-2 rounded-lg text-xs font-body border transition-all"
                style={{
                  color: "var(--text-dim)",
                  borderColor: "rgba(245,166,35,0.35)",
                  background: "var(--surface-card)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "rgba(245,166,35,0.6)";
                  e.currentTarget.style.background = "rgba(245,166,35,0.05)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(245,166,35,0.35)";
                  e.currentTarget.style.background = "var(--surface-card)";
                }}
              >
                Marcar todos como lidos
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "Todos", count: alertsSource.length },
              { key: "critical", label: "Críticos", count: alertsSource.filter((a) => a.type === "critical").length },
              { key: "warning", label: "Atenção", count: alertsSource.filter((a) => a.type === "warning").length },
              { key: "win", label: "Wins", count: alertsSource.filter((a) => a.type === "win").length },
              { key: "info", label: "Info", count: alertsSource.filter((a) => a.type === "info").length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold border transition-all"
                style={
                  filter === tab.key
                    ? { background: "rgba(245,166,35,0.1)", borderColor: "rgba(245,166,35,0.5)", color: "#f5a623" }
                    : {
                        borderColor: "rgba(245,166,35,0.25)",
                        color: "var(--text-dim)",
                        background: "var(--surface-card)",
                      }
                }
              >
                {tab.label}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: filter === tab.key ? "rgba(245,166,35,0.15)" : "var(--border-hover)",
                    color: filter === tab.key ? "#f5a623" : "var(--text-dimmer)",
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Alerts List — white cards */}
          <div className="space-y-2.5">
            {filtered.map((alert, i) => {
              const isRead = alert.read || readState.includes(alert.id);
              return (
                <div
                  key={alert.id}
                  onClick={() => markAsRead(alert.id)}
                  className={cn(
                    "rounded-xl border p-4 cursor-pointer transition-all group animate-fade-up flex items-start gap-3",
                    isRead && "opacity-55"
                  )}
                  style={{
                    background: "var(--surface-card)",
                    border: `1px solid ${isRead ? "var(--border-color)" : alert.border}`,
                    boxShadow: isRead
                      ? "none"
                      : `0 2px 12px ${alert.bg}`,
                    animationDelay: `${i * 50}ms`,
                    animationFillMode: "both",
                  }}
                  onMouseEnter={e => {
                    if (!isRead) e.currentTarget.style.boxShadow = `0 4px 20px ${alert.bg}, 0 0 0 1px ${alert.border}`;
                    else e.currentTarget.style.background = "var(--row-hover)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = isRead ? "none" : `0 2px 12px ${alert.bg}`;
                    e.currentTarget.style.background = "var(--surface-card)";
                  }}
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                    style={{ background: isRead ? "transparent" : alert.color, position: "relative", width: "3px", flexShrink: 0, marginRight: "-3px", alignSelf: "stretch", borderRadius: "99px", opacity: isRead ? 0 : 1 }}
                  />

                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      alert.type === "critical" && !isRead ? "animate-pulse-red" : ""
                    )}
                    style={{ background: `${alert.color}15` }}
                  >
                    <alert.icon size={16} style={{ color: alert.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full uppercase"
                        style={{ background: `${alert.color}12`, color: alert.color }}
                      >
                        {typeConfig[alert.type as keyof typeof typeConfig]}
                      </span>
                      {!isRead && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: alert.color }} />
                      )}
                      <span className="text-[11px] font-body ml-auto" style={{ color: "var(--text-dimmer)" }}>
                        {alert.time}
                      </span>
                    </div>
                    <h4 className="font-heading font-semibold text-sm" style={{ color: "var(--text-main)" }}>
                      {alert.title}
                    </h4>
                    <p className="text-xs font-body mt-0.5 leading-relaxed" style={{ color: "var(--text-dim)" }}>
                      {alert.detail}
                    </p>
                    <p className="text-[11px] font-body mt-1" style={{ color: "var(--text-dimmer)" }}>
                      Cliente: {alert.client}
                    </p>
                  </div>

                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-lg text-xs font-body border flex-shrink-0 whitespace-nowrap"
                    style={{
                      color: "var(--text-dim)",
                      borderColor: "rgba(245,166,35,0.4)",
                      background: "rgba(245,166,35,0.06)",
                    }}
                  >
                    Ver Detalhes
                  </button>
                </div>
              );
            })}
          </div>
        </PageTag>
  );
}
