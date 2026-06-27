"use client";

import { useState } from "react";
import { cn } from "@/uxpilot-ui/lib/utils";
import Sidebar from "@/uxpilot-ui/components/Sidebar";
import CommandStrip from "@/uxpilot-ui/components/CommandStrip";
import BrainShelf from "@/uxpilot-ui/components/BrainShelf";
import MetricPrism from "@/uxpilot-ui/components/MetricPrism";
import PerformanceChart from "@/uxpilot-ui/components/PerformanceChart";
import LiveIntelligenceFeed from "@/uxpilot-ui/components/LiveIntelligenceFeed";
import AgencyHealthLayout from "@/uxpilot-ui/components/AgencyHealthLayout";
import ConnectAccountCard from "@/uxpilot-ui/components/ConnectAccountCard";

export default function Dashboard() {
  const [isEmptyState, setIsEmptyState] = useState(false);
  const [activeTab, setActiveTab] = useState<"data" | "empty">("data");

  const handleToggleEmpty = () => {
    const newEmpty = !isEmptyState;
    setIsEmptyState(newEmpty);
    setActiveTab(newEmpty ? "empty" : "data");
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-bg)" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Command Strip */}
        <CommandStrip onToggleEmpty={handleToggleEmpty} isEmptyState={isEmptyState} />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}>

          {/* Tab Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab("data"); setIsEmptyState(false); }}
              className="tab-transition px-4 py-1.5 rounded-lg text-xs font-heading font-semibold border"
              style={
                !isEmptyState
                  ? { background: "rgba(245,166,35,0.1)", borderColor: "rgba(245,166,35,0.4)", color: "var(--ui-accent)" }
                  : { background: "transparent", borderColor: "var(--border-color)", color: "var(--text-dimmer)" }
              }
            >
              Com Dados
            </button>
            <button
              onClick={() => { setActiveTab("empty"); setIsEmptyState(true); }}
              className="tab-transition px-4 py-1.5 rounded-lg text-xs font-heading font-semibold border"
              style={
                isEmptyState
                  ? { background: "rgba(124,58,237,0.1)", borderColor: "rgba(124,58,237,0.4)", color: "#7c3aed" }
                  : { background: "transparent", borderColor: "var(--border-color)", color: "var(--text-dimmer)" }
              }
            >
              Estado Vazio
            </button>

            <div className="ml-auto">
              <h1 className="font-heading font-bold text-xl hidden md:block" style={{ color: "var(--text-main)" }}>
                Executive Dashboard
              </h1>
            </div>
          </div>

          {/* Page Title Mobile */}
          <div className="md:hidden">
            <h1 className="font-heading font-bold text-lg" style={{ color: "var(--text-main)" }}>Executive Dashboard</h1>
            <p className="text-xs font-body" style={{ color: "var(--text-dim)" }}>Agency Command Center</p>
          </div>

          {/* Main content — animated transition between states */}
          <div
            key={isEmptyState ? "empty" : "data"}
            className="tab-transition animate-fade-up space-y-5"
          >
            {/* Brain Shelf */}
            {!isEmptyState && <BrainShelf />}

            {/* Metric Prism */}
            <MetricPrism isEmptyState={isEmptyState} />

            {/* Empty State Connect Card */}
            {isEmptyState && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ConnectAccountCard />
                <div
                  className="rounded-2xl border p-6 flex flex-col gap-4"
                  style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)" }}
                >
                  <h3 className="font-heading font-semibold" style={{ color: "var(--text-main)" }}>O que você verá aqui</h3>
                  {[
                    "Métricas em tempo real de todas as contas",
                    "Sugestões de IA para otimização de campanhas",
                    "Alertas automáticos de anomalias",
                    "Relatórios consolidados por cliente",
                    "Projeções de ROAS e CPL com ML",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(79,70,229,0.2)" }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#818cf8" }} />
                      </div>
                      <span className="text-sm font-body" style={{ color: "var(--text-dim)" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hybrid Viewport — 70/30 split */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-4">
              {/* Performance Chart */}
              <div
                className="rounded-2xl p-5"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                  minHeight: "360px"
                }}
              >
                <PerformanceChart isEmptyState={isEmptyState} />
              </div>

              {/* Live Intelligence Feed */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-color)",
                  boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
                  minHeight: "360px"
                }}
              >
                <LiveIntelligenceFeed isEmptyState={isEmptyState} />
              </div>
            </div>

            {/* Agency Health Layout */}
            <AgencyHealthLayout isEmptyState={isEmptyState} />
          </div>
        </main>
      </div>
    </div>
  );
}