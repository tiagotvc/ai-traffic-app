"use client";

import { useState } from "react";
import { RefreshCw, ChevronDown, Calendar, Building2, BarChart2, Loader2 } from "lucide-react";
import { cn } from "@/uxpilot-ui/lib/utils";

const clients = ["Todos os Clientes", "TechVision Ltda", "BrandForce Corp", "NovaMarca SA", "DigitalPrime"];
const accounts = ["Todas as Contas", "Meta Ads — Geral", "Meta Ads — Retargeting", "Meta Ads — Prospecting"];
const periods = ["Últimos 7 dias", "Últimos 14 dias", "Últimos 30 dias", "Este Mês", "Trimestre Atual", "Personalizado"];

interface SelectDropdownProps {
  icon: React.ReactNode;
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

function SelectDropdown({ icon, label, options, value, onChange }: SelectDropdownProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all duration-200 whitespace-nowrap"
        )}
        style={{
          color: "var(--text-main)",
          background: "var(--filter-btn-bg)",
          borderColor: open ? "var(--amber)" : "var(--border-color)",
        }}
      >
        <span style={{ color: "var(--text-dim)" }}>{icon}</span>
        <span className="font-body text-xs font-medium hidden sm:block mr-1" style={{ color: "var(--text-dim)" }}>{label}:</span>
        <span className="font-body text-sm max-w-[120px] truncate">{value}</span>
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} style={{ color: "var(--text-dim)" }} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 min-w-[180px] rounded-lg border overflow-hidden z-50 shadow-2xl"
          style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm font-body transition-colors"
              style={{
                color: value === opt ? "var(--amber)" : "var(--text-dim)",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--row-hover)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  onToggleEmpty: () => void;
  isEmptyState: boolean;
}

export default function CommandStrip({ onToggleEmpty, isEmptyState }: Props) {
  const [client, setClient] = useState(clients[0]);
  const [account, setAccount] = useState(accounts[0]);
  const [period, setPeriod] = useState(periods[2]);
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2200);
  };

  return (
    <div
      className="sticky top-0 z-20 w-full border-b"
      style={{ background: "var(--surface-header)", backdropFilter: "blur(12px)", borderColor: "var(--border-color)" }}
    >
      <div className="flex flex-wrap items-center gap-2 px-4 md:px-6 py-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <SelectDropdown icon={<Building2 size={14} />} label="Cliente" options={clients} value={client} onChange={setClient} />
          <SelectDropdown icon={<BarChart2 size={14} />} label="Conta" options={accounts} value={account} onChange={setAccount} />
          <SelectDropdown icon={<Calendar size={14} />} label="Período" options={periods} value={period} onChange={setPeriod} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Empty State Toggle */}
          <button
            onClick={onToggleEmpty}
            className={cn(
              "px-3 py-2 rounded-lg text-xs font-body font-medium border transition-all duration-200 whitespace-nowrap",
            )}
            style={isEmptyState ? {
              borderColor: "rgba(245,166,35,0.5)",
              color: "var(--amber)",
              background: "rgba(245,166,35,0.1)",
            } : {
              borderColor: "var(--border-color)",
              color: "var(--text-dim)",
              background: "var(--filter-btn-bg)",
            }}
          >
            {isEmptyState ? "Com Dados" : "Estado Vazio"}
          </button>

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-heading font-semibold transition-all duration-200 whitespace-nowrap shadow-lg",
              syncing ? "opacity-70 cursor-wait" : "hover:brightness-110 active:scale-95"
            )}
            style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419" }}
          >
            {syncing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            <span>{syncing ? "Sincronizando..." : "Sincronizar Meta"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}