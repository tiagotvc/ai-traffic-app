"use client";

import { useState } from "react";
import { Brain, TrendingUp, AlertTriangle, Lightbulb, ChevronRight, X } from "lucide-react";
import { cn } from "@/uxpilot-ui/lib/utils";

const suggestions = [
  {
    id: 1,
    type: "opportunity",
    icon: TrendingUp,
    title: "Escalar TechVision +35%",
    body: "CPL caiu 18% nos últimos 3 dias. Janela ideal para escalar budget antes da saturação.",
    action: "Aplicar Escala",
    confidence: 94,
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.2)",
  },
  {
    id: 2,
    type: "alert",
    icon: AlertTriangle,
    title: "BrandForce CTR abaixo",
    body: "CTR dropped to 0.8% — 40% below benchmark. Creative fatigue detected on 3 ad sets.",
    action: "Ver Criativos",
    confidence: 88,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
  },
  {
    id: 3,
    type: "suggestion",
    icon: Lightbulb,
    title: "Novo Público para NovaMarca",
    body: "Lookalike 3–5% baseado em compradores recentes projetado para reduzir CPL em ~22%.",
    action: "Criar Audiência",
    confidence: 81,
    color: "#f5a623",
    bg: "rgba(245,166,35,0.08)",
    border: "rgba(245,166,35,0.2)",
  },
];

export default function BrainShelf() {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const visible = suggestions.filter((s) => !dismissed.includes(s.id));

  if (visible.length === 0) return null;

  return (
    <div
      className="w-full rounded-2xl p-4"
      style={{
        background: "var(--brain-shelf-bg, linear-gradient(135deg, rgba(79,70,229,0.12), rgba(79,70,229,0.04)))",
        border: "1px solid var(--brain-shelf-border, rgba(79,70,229,0.25))",
        boxShadow: "0 2px 16px rgba(124,58,237,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #6d28d9, #7c3aed)" }}
        >
          <Brain size={14} className="text-white" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-sm" style={{ color: "var(--text-main)" }}>Agency Brain</h3>
          <p className="text-[11px]" style={{ color: "var(--text-dimmer)" }}>
            {visible.length} sugestão{visible.length !== 1 ? "s" : ""} · IA Generativa
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span
            className="text-[10px] font-body px-2 py-0.5 rounded-full font-medium"
            style={{ background: "rgba(124,58,237,0.15)", color: "#7c3aed" }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {visible.map((s, i) => (
          <div
            key={s.id}
            className="rounded-xl p-3 relative group cursor-pointer transition-all animate-fade-up"
            style={{
              background: "var(--surface-card)",
              border: `1px solid ${s.border}`,
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              animationDelay: `${i * 80}ms`,
              animationFillMode: "both",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${s.color}22`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; }}
          >
            <button
              onClick={() => setDismissed([...dismissed, s.id])}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
              style={{ color: "var(--text-dimmer)" }}
            >
              <X size={11} />
            </button>

            <div className="flex items-start gap-2 mb-2">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${s.color}18` }}
              >
                <s.icon size={13} style={{ color: s.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading font-semibold text-xs leading-tight" style={{ color: "var(--text-main)" }}>{s.title}</p>
              </div>
            </div>

            <p className="text-[11px] leading-relaxed mb-2.5 pr-4" style={{ color: "var(--text-dim)" }}>
              {s.body}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.confidence}%`, background: s.color }}
                  />
                </div>
                <span className="text-[10px] font-body" style={{ color: "var(--text-dimmer)" }}>{s.confidence}% conf.</span>
              </div>
              <button
                className="text-[11px] font-heading font-semibold flex items-center gap-0.5 hover:gap-1.5 transition-all"
                style={{ color: s.color }}
              >
                {s.action} <ChevronRight size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}