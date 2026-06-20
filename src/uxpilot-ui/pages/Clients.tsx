"use client";

import Sidebar from "@/uxpilot-ui/components/Sidebar";
import CommandStrip from "@/uxpilot-ui/components/CommandStrip";
import {
  Plus,
  Search,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Check,
  Building2,
  Megaphone,
  User,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

/* ─────────── Static data ─────────── */
const clients = [
  {
    id: 1,
    name: "TechVision Ltda",
    logo: "T",
    color: "#4f46e5",
    industry: "SaaS / B2B",
    accounts: 3,
    monthlyBudget: "R$52.3K",
    roas: "5.2×",
    cpl: "R$14.20",
    status: "healthy",
    trend: "+12%",
    since: "Mar 2024",
    manager: "Ana Costa",
    managerAvatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-6.jpg",
  },
  {
    id: 2,
    name: "BrandForce Corp",
    logo: "B",
    color: "#f5a623",
    industry: "E-commerce",
    accounts: 2,
    monthlyBudget: "R$38.1K",
    roas: "3.8×",
    cpl: "R$22.40",
    status: "warning",
    trend: "-4%",
    since: "Jan 2024",
    manager: "Lucas Mendes",
    managerAvatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg",
  },
  {
    id: 3,
    name: "NovaMarca SA",
    logo: "N",
    color: "#10b981",
    industry: "Retail",
    accounts: 2,
    monthlyBudget: "R$29.7K",
    roas: "4.1×",
    cpl: "R$17.80",
    status: "healthy",
    trend: "+8%",
    since: "Jun 2024",
    manager: "Maria Santos",
    managerAvatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg",
  },
  {
    id: 4,
    name: "DigitalPrime",
    logo: "D",
    color: "#7c3aed",
    industry: "Fintech",
    accounts: 1,
    monthlyBudget: "R$22.7K",
    roas: "4.9×",
    cpl: "R$15.60",
    status: "healthy",
    trend: "+21%",
    since: "Sep 2024",
    manager: "Carlos Oliveira",
    managerAvatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg",
  },
];

const businessManagers = [
  { id: 1, name: "Addoctor", accounts: 0, pages: 0 },
  { id: 2, name: "Alles Pizza", accounts: 0, pages: 0 },
  { id: 3, name: "Amanda Janes", accounts: 0, pages: 0 },
  { id: 4, name: "Aprenda Archviz", accounts: 0, pages: 0 },
  { id: 5, name: "BeCare", accounts: 0, pages: 0 },
  { id: 6, name: "BM - Gabi Reis - Campanhas", accounts: 2, pages: 1 },
  { id: 7, name: "BM - greicerampondermato", accounts: 1, pages: 0 },
  { id: 8, name: "BM - Raizer da Silva Ferreira", accounts: 3, pages: 2 },
  { id: 9, name: "Bm - Recupere", accounts: 0, pages: 0 },
  { id: 10, name: "BM - Vereadora Tita", accounts: 1, pages: 1 },
  { id: 11, name: "BM 02", accounts: 2, pages: 0 },
  { id: 12, name: "BM1 - Gabriela Dawson Beauty Concept", accounts: 1, pages: 1 },
  { id: 13, name: "Bom Jardim Ivoti", accounts: 0, pages: 0 },
  { id: 14, name: "BotMed - Automação de atendimento", accounts: 0, pages: 0 },
];

const adAccounts = [
  { id: "act_1", name: "TechVision Ads Principal", spend: "R$52.3K" },
  { id: "act_2", name: "TechVision Ads Secundário", spend: "R$18.1K" },
  { id: "act_3", name: "BrandForce Main", spend: "R$38.1K" },
  { id: "act_4", name: "NovaMarca Conta 1", spend: "R$29.7K" },
  { id: "act_5", name: "DigitalPrime Ads", spend: "R$22.7K" },
  { id: "act_6", name: "Nova Conta Teste", spend: "R$0" },
];

const STEPS = [
  { number: 1, label: "Nome do cliente", sublabel: "Identificação básica", icon: User },
  { number: 2, label: "Business Manager", sublabel: "Selecionar BM vinculado", icon: Building2 },
  { number: 3, label: "Contas de anúncio", sublabel: "Conectar ad accounts", icon: Megaphone },
];

/* ─────────── Circular progress ─────────── */
function CircularProgress({ value }: { value: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border-color)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r}
          fill="none" stroke="#f5a623" strokeWidth="5"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute text-base font-bold font-heading" style={{ color: "var(--amber)" }}>{value}</span>
    </div>
  );
}

/* ─────────── Score item ─────────── */
function ScoreItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: done ? "rgba(16,185,129,0.12)" : "var(--surface-bg)",
          border: `1.5px solid ${done ? "#10b981" : "var(--border-hover)"}`,
        }}
      >
        {done && <Check size={9} style={{ color: "#10b981" }} strokeWidth={3} />}
      </div>
      <span className="text-xs font-body" style={{ color: done ? "var(--text-main)" : "var(--text-dimmer)" }}>
        {label}
      </span>
    </div>
  );
}

/* ─────────── Step item (left column) ─────────── */
function StepItem({
  active,
  completed,
  onClick,
  stepNum,
  label,
  sublabel,
  isLast,
}: {
  active: boolean;
  completed: boolean;
  onClick: () => void;
  stepNum: number;
  label: string;
  sublabel?: string;
  isLast?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-start gap-3 px-1 py-3 w-full text-left group transition-all"
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all"
        style={{
          background: completed ? "rgba(245,166,35,0.12)" : active ? "#f5a623" : "var(--surface-bg)",
          border: completed ? "2px solid #f5a623" : active ? "2px solid #f5a623" : "2px solid var(--border-color)",
          boxShadow: active ? "0 0 0 4px rgba(245,166,35,0.12)" : "none",
        }}
      >
        {completed ? (
          <Check size={13} style={{ color: "#f5a623" }} strokeWidth={2.5} />
        ) : (
          <span style={{ color: active ? "#0f1419" : "var(--text-dimmer)", fontSize: 11, fontWeight: 700 }}>
            {stepNum}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 pt-1.5">
        <p
          className="text-sm font-heading font-semibold leading-tight truncate"
          style={{ color: active ? "var(--amber)" : completed ? "var(--text-main)" : "var(--text-dim)" }}
        >
          {label}
        </p>
        {sublabel && (
          <p className="text-[11px] font-body mt-0.5 truncate" style={{ color: "var(--text-dimmer)" }}>
            {sublabel}
          </p>
        )}
      </div>
    </button>
  );
}

/* ─────────── Form card ─────────── */
function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}
    >
      {children}
    </div>
  );
}

/* ─────────── Main component ─────────── */
export default function Clients() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "create">("list");

  // Create form state
  const [step, setStep] = useState(1);
  const [clientName, setClientName] = useState("");
  const [selectedBM, setSelectedBM] = useState<number | null>(null);
  const [bmSearch, setBmSearch] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [accountSearch, setAccountSearch] = useState("");

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setStep(1);
    setClientName("");
    setSelectedBM(null);
    setBmSearch("");
    setSelectedAccounts([]);
    setAccountSearch("");
    setView("create");
  };

  const handleNext = () => { if (step < 3) setStep(step + 1); };
  const handleBack = () => { if (step > 1) setStep(step - 1); };
  const handleCreateClient = () => setView("list");

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const filteredBMs = businessManagers.filter((bm) =>
    bm.name.toLowerCase().includes(bmSearch.toLowerCase())
  );
  const filteredAccounts = adAccounts.filter((a) =>
    a.name.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const canContinueStep1 = clientName.trim().length > 0;
  const canContinueStep2 = selectedBM !== null;

  // Progress score
  const score = Math.round(
    (canContinueStep1 ? 33 : 0) +
    (canContinueStep2 ? 33 : 0) +
    (selectedAccounts.length > 0 ? 34 : 0)
  );

  const selectedBMName = businessManagers.find((b) => b.id === selectedBM)?.name ?? null;

  /* ══════════════════════════════════════════
     LIST VIEW
  ══════════════════════════════════════════ */
  if (view === "list") {
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
                <h1 className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>Clientes</h1>
                <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>{filtered.length} clientes ativos</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dimmer)" }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar clientes..."
                    className="pl-8 pr-3 py-2 rounded-lg text-sm font-body border focus:outline-none transition-colors"
                    style={{ background: "var(--input-bg)", color: "var(--text-main)", borderColor: "var(--border-color)" }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#f5a623")}
                    onBlur={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
                  />
                </div>
                <button
                  onClick={openCreate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-heading font-semibold transition-all hover:brightness-110 active:scale-95 shadow-md"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", color: "#ffffff" }}
                >
                  <Plus size={14} />
                  Novo Cliente
                </button>
              </div>
            </div>

            {/* Client Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
              {filtered.map((client, i) => (
                <div
                  key={client.id}
                  className="rounded-xl border overflow-hidden hover:border-opacity-20 transition-all kpi-card-hover cursor-pointer group animate-fade-up"
                  style={{
                    background: "var(--surface-card)",
                    borderColor: "var(--border-color)",
                    animationDelay: `${i * 80}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${client.color}, transparent)` }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-heading font-bold text-lg text-white flex-shrink-0"
                          style={{ background: `${client.color}20`, border: `1px solid ${client.color}30` }}
                        >
                          <span style={{ color: client.color }}>{client.logo}</span>
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold text-base" style={{ color: "var(--text-main)" }}>{client.name}</h3>
                          <p className="text-xs font-body" style={{ color: "var(--text-dim)" }}>
                            {client.industry} · Desde {client.since}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={client.status} />
                        <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-dim)" }}>
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: "Budget/mês", value: client.monthlyBudget, color: "#f5a623" },
                        { label: "ROAS", value: client.roas, color: "#10b981" },
                        { label: "CPL", value: client.cpl, color: "var(--text-dim)" },
                      ].map((k) => (
                        <div key={k.label} className="text-center p-2 rounded-lg" style={{ background: "var(--surface-thead)" }}>
                          <div className="font-heading font-bold text-sm" style={{ color: k.color }}>{k.value}</div>
                          <div className="text-[10px] font-body mt-0.5" style={{ color: "var(--text-dimmer)" }}>{k.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={client.managerAvatar} alt={client.manager} className="w-6 h-6 rounded-full" style={{ border: "1px solid var(--border-hover)" }} />
                        <span className="text-xs font-body" style={{ color: "var(--text-dim)" }}>{client.manager}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {client.trend.startsWith("+") ? (
                          <TrendingUp size={12} style={{ color: "#10b981" }} />
                        ) : (
                          <TrendingDown size={12} style={{ color: "#ef4444" }} />
                        )}
                        <span
                          className="text-xs font-body font-semibold"
                          style={{ color: client.trend.startsWith("+") ? "#10b981" : "#ef4444" }}
                        >
                          {client.trend} este mês
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════
     CREATE VIEW — Full-page 3-column layout
  ══════════════════════════════════════════ */
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-bg)" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top breadcrumb header */}
        <div
          className="sticky top-0 z-20 w-full border-b px-6 py-3 flex items-center gap-3"
          style={{ background: "var(--surface-card)", borderColor: "var(--border-color)", boxShadow: "0 1px 0 var(--border-color)" }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>
              <button
                onClick={() => setView("list")}
                className="hover:underline"
                style={{ color: "var(--text-dimmer)" }}
              >
                Clientes
              </button>
              {" › "}
              <span style={{ color: "var(--text-dim)" }}>Novo Cliente</span>
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>
                Criar novo cliente
              </h1>
              <span
                className="px-2 py-0.5 rounded text-xs font-heading font-semibold"
                style={{ background: "rgba(245,166,35,0.15)", color: "var(--amber)", border: "1px solid rgba(245,166,35,0.3)" }}
              >
                Rascunho
              </span>
            </div>
          </div>
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-heading font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: "var(--border-hover)", color: "var(--text-main)", background: "var(--surface-card)" }}
          >
            <ArrowLeft size={14} />
            Voltar
          </button>
        </div>

        {/* 3-column area */}
        <div className="flex-1 flex overflow-hidden" style={{ background: "var(--surface-bg)" }}>

          {/* ── LEFT: Vertical stepper ── */}
          <div
            className="w-56 flex-shrink-0 border-r overflow-y-auto py-6 px-4"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          >
            <p className="text-[10px] font-heading font-bold tracking-widest mb-5 px-1" style={{ color: "var(--text-dimmer)" }}>
              ETAPAS
            </p>
            <div className="relative flex flex-col gap-0">
              {/* Connecting line */}
              <div
                className="absolute left-[18px] top-8 bottom-8 w-px"
                style={{ background: "var(--border-color)" }}
              />
              {STEPS.map((s, idx) => (
                <StepItem
                  key={s.number}
                  active={step === s.number}
                  completed={step > s.number}
                  onClick={() => { if (step > s.number || s.number === 1 || (s.number === 2 && canContinueStep1) || (s.number === 3 && canContinueStep2)) setStep(s.number); }}
                  stepNum={s.number}
                  label={s.label}
                  sublabel={s.sublabel}
                  isLast={idx === STEPS.length - 1}
                />
              ))}
            </div>
          </div>

          {/* ── CENTER: Form content ── */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: "thin", background: "var(--surface-bg)" }}
          >
            <div className="max-w-2xl mx-auto px-8 py-7 space-y-5">

              {/* ════ STEP 1: Nome do cliente ════ */}
              {step === 1 && (
                <div className="space-y-5 animate-fade-up">
                  <div>
                    <h2 className="font-heading font-bold text-lg" style={{ color: "var(--text-main)" }}>
                      Identificação do cliente
                    </h2>
                    <p className="text-sm font-body mt-1" style={{ color: "var(--text-dim)" }}>
                      Defina o nome que identificará este cliente na plataforma.
                    </p>
                  </div>

                  <FormCard>
                    <div className="space-y-1.5">
                      <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>
                        Nome do cliente
                      </label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: TechVision Ltda"
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl border text-sm font-body outline-none transition-all"
                        style={{
                          background: "var(--surface-bg)",
                          borderColor: "var(--border-color)",
                          color: "var(--text-main)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = "#f5a623")}
                        onBlur={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
                      />
                    </div>
                  </FormCard>

                  <FormCard>
                    <p className="font-body font-semibold text-sm mb-2" style={{ color: "var(--text-main)" }}>
                      Setor / Indústria
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["SaaS / B2B", "E-commerce", "Retail", "Fintech", "Saúde", "Educação", "Imóveis"].map((sector) => (
                        <button
                          key={sector}
                          className="px-3 py-1.5 rounded-lg text-xs font-heading font-semibold border transition-all"
                          style={{
                            background: "var(--surface-bg)",
                            color: "var(--text-dim)",
                            borderColor: "var(--border-color)",
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "#f5a623";
                            e.currentTarget.style.color = "var(--amber)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "var(--border-color)";
                            e.currentTarget.style.color = "var(--text-dim)";
                          }}
                        >
                          {sector}
                        </button>
                      ))}
                    </div>
                  </FormCard>

                  <FormCard>
                    <p className="font-body font-semibold text-sm mb-1" style={{ color: "var(--text-main)" }}>
                      Gestor responsável
                    </p>
                    <p className="text-xs font-body mb-3" style={{ color: "var(--text-dim)" }}>
                      Selecione quem gerencia este cliente na agência.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: "Ana Costa", avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-6.jpg" },
                        { name: "Lucas Mendes", avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg" },
                        { name: "Maria Santos", avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg" },
                        { name: "Carlos Oliveira", avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg" },
                      ].map((m) => (
                        <div
                          key={m.name}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all"
                          style={{ background: "var(--surface-bg)", borderColor: "var(--border-color)", color: "var(--text-dim)" }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = "#f5a623";
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
                          }}
                        >
                          <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full" />
                          <span className="text-xs font-body font-medium" style={{ color: "var(--text-main)" }}>{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </FormCard>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleNext}
                      disabled={!canContinueStep1}
                      className="px-8 py-3 rounded-xl font-heading font-bold text-sm transition-all hover:brightness-110 active:scale-95 shadow-lg"
                      style={{
                        background: canContinueStep1 ? "linear-gradient(135deg, #f5a623, #e8920d)" : "var(--surface-card)",
                        color: canContinueStep1 ? "#0f1419" : "var(--text-dimmer)",
                        boxShadow: canContinueStep1 ? "0 4px 16px rgba(245,166,35,0.35)" : "none",
                        cursor: canContinueStep1 ? "pointer" : "not-allowed",
                        border: canContinueStep1 ? "none" : "1px solid var(--border-color)",
                      }}
                    >
                      Próximo: Business Manager →
                    </button>
                  </div>
                </div>
              )}

              {/* ════ STEP 2: Business Manager ════ */}
              {step === 2 && (
                <div className="space-y-5 animate-fade-up">
                  <div>
                    <h2 className="font-heading font-bold text-lg" style={{ color: "var(--text-main)" }}>
                      Business Manager
                    </h2>
                    <p className="text-sm font-body mt-1" style={{ color: "var(--text-dim)" }}>
                      Selecione o Business Manager vinculado a este cliente.
                    </p>
                  </div>

                  <FormCard>
                    <div className="space-y-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dimmer)" }} />
                        <input
                          type="text"
                          value={bmSearch}
                          onChange={(e) => setBmSearch(e.target.value)}
                          placeholder="Buscar Business Manager..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-body border outline-none transition-all"
                          style={{
                            background: "var(--surface-bg)",
                            borderColor: "var(--border-color)",
                            color: "var(--text-main)",
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = "#f5a623")}
                          onBlur={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
                        />
                      </div>
                      <div
                        className="rounded-xl border overflow-y-auto"
                        style={{ maxHeight: 320, borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
                      >
                        {filteredBMs.map((bm, i) => (
                          <button
                            key={bm.id}
                            onClick={() => setSelectedBM(bm.id)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-body text-left transition-all"
                            style={{
                              borderBottom: i < filteredBMs.length - 1 ? "1px solid var(--border-color)" : "none",
                              background: selectedBM === bm.id ? "rgba(245,166,35,0.07)" : "transparent",
                            }}
                            onMouseEnter={e => { if (selectedBM !== bm.id) e.currentTarget.style.background = "var(--row-hover)"; }}
                            onMouseLeave={e => { if (selectedBM !== bm.id) e.currentTarget.style.background = "transparent"; }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                  borderColor: selectedBM === bm.id ? "#f5a623" : "var(--border-hover)",
                                  background: selectedBM === bm.id ? "#f5a623" : "transparent",
                                }}
                              >
                                {selectedBM === bm.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span
                                className="font-medium"
                                style={{ color: selectedBM === bm.id ? "var(--amber)" : "var(--text-main)" }}
                              >
                                {bm.name}
                              </span>
                            </div>
                            <span className="text-xs flex-shrink-0 ml-2" style={{ color: "var(--text-dimmer)" }}>
                              {bm.accounts} conta(s) · {bm.pages} pág.
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </FormCard>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleBack}
                      className="px-5 py-2.5 rounded-xl font-heading font-semibold text-sm transition-all hover:opacity-80"
                      style={{ border: "1px solid var(--border-color)", color: "var(--text-dim)", background: "var(--surface-card)" }}
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={!canContinueStep2}
                      className="px-8 py-3 rounded-xl font-heading font-bold text-sm transition-all hover:brightness-110 active:scale-95"
                      style={{
                        background: canContinueStep2 ? "linear-gradient(135deg, #f5a623, #e8920d)" : "var(--surface-card)",
                        color: canContinueStep2 ? "#0f1419" : "var(--text-dimmer)",
                        boxShadow: canContinueStep2 ? "0 4px 14px rgba(245,166,35,0.3)" : "none",
                        cursor: canContinueStep2 ? "pointer" : "not-allowed",
                        border: canContinueStep2 ? "none" : "1px solid var(--border-color)",
                      }}
                    >
                      Próximo: Contas de anúncio →
                    </button>
                  </div>
                </div>
              )}

              {/* ════ STEP 3: Contas de anúncio ════ */}
              {step === 3 && (
                <div className="space-y-5 animate-fade-up">
                  <div>
                    <h2 className="font-heading font-bold text-lg" style={{ color: "var(--text-main)" }}>
                      Contas de anúncio
                    </h2>
                    <p className="text-sm font-body mt-1" style={{ color: "var(--text-dim)" }}>
                      Conecte as contas Meta Ads que este cliente irá gerenciar.
                    </p>
                  </div>

                  <FormCard>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="font-semibold text-xs px-2 py-0.5 rounded"
                          style={{ background: "rgba(245,166,35,0.1)", color: "var(--amber)", border: "1px solid rgba(245,166,35,0.3)" }}
                        >
                          {selectedAccounts.length} SELECIONADA(S)
                        </span>
                        <span className="text-xs uppercase tracking-wider font-body font-medium" style={{ color: "var(--text-dimmer)" }}>
                          GASTO · ÚLTIMOS 30 DIAS
                        </span>
                      </div>

                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dimmer)" }} />
                        <input
                          type="text"
                          value={accountSearch}
                          onChange={(e) => setAccountSearch(e.target.value)}
                          placeholder="Buscar conta de anúncio..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-body border outline-none transition-all"
                          style={{
                            background: "var(--surface-bg)",
                            borderColor: "var(--border-color)",
                            color: "var(--text-main)",
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = "#f5a623")}
                          onBlur={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
                        />
                      </div>

                      <div
                        className="rounded-xl border overflow-y-auto"
                        style={{ maxHeight: 300, borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
                      >
                        {filteredAccounts.length === 0 ? (
                          <div className="py-10 text-center text-sm font-body" style={{ color: "var(--text-dimmer)" }}>
                            Nenhuma conta encontrada
                          </div>
                        ) : (
                          filteredAccounts.map((acc, i) => {
                            const isSelected = selectedAccounts.includes(acc.id);
                            return (
                              <button
                                key={acc.id}
                                onClick={() => toggleAccount(acc.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-body text-left transition-all"
                                style={{
                                  borderBottom: i < filteredAccounts.length - 1 ? "1px solid var(--border-color)" : "none",
                                  background: isSelected ? "rgba(245,166,35,0.07)" : "transparent",
                                }}
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "var(--row-hover)"; }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                              >
                                <div
                                  className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                  style={{
                                    borderColor: isSelected ? "#f5a623" : "var(--border-hover)",
                                    background: isSelected ? "#f5a623" : "transparent",
                                  }}
                                >
                                  {isSelected && <Check size={10} color="#0f1419" strokeWidth={3} />}
                                </div>
                                <span className="flex-1 font-medium" style={{ color: "var(--text-main)" }}>
                                  {acc.name}
                                </span>
                                <span className="text-xs flex-shrink-0" style={{ color: "var(--text-dimmer)" }}>
                                  {acc.spend}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </FormCard>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleBack}
                      className="px-5 py-2.5 rounded-xl font-heading font-semibold text-sm transition-all hover:opacity-80"
                      style={{ border: "1px solid var(--border-color)", color: "var(--text-dim)", background: "var(--surface-card)" }}
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={handleCreateClient}
                      className="px-8 py-3 rounded-xl font-heading font-bold text-sm transition-all hover:brightness-110 active:scale-95 flex items-center gap-2"
                      style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419", boxShadow: "0 4px 16px rgba(245,166,35,0.35)" }}
                    >
                      <Check size={14} />
                      Criar cliente 🚀
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Progress / Preview panel ── */}
          <div
            className="w-60 flex-shrink-0 border-l overflow-y-auto py-5 px-4 space-y-5"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          >
            {/* Completion score */}
            <div>
              <p className="font-heading font-bold text-sm mb-3" style={{ color: "var(--text-main)" }}>
                Progresso
              </p>
              <div className="flex items-start gap-3">
                <CircularProgress value={score} />
                <p className="text-xs font-body leading-relaxed mt-1" style={{ color: "var(--text-dim)" }}>
                  Preencha todos os campos para completar o cliente.
                </p>
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border-color)" }} />

            {/* Client preview card */}
            <div>
              <p className="font-heading font-bold text-sm mb-1" style={{ color: "var(--text-main)" }}>
                Prévia do cliente
              </p>
              <p className="text-xs font-body mb-3" style={{ color: "var(--text-dim)" }}>
                Visualização do perfil a ser criado.
              </p>
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--border-color)", background: "var(--surface-bg)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
              >
                <div
                  className="h-20 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(79,70,229,0.08) 100%)" }}
                >
                  {clientName ? (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-bold text-xl"
                      style={{ background: "rgba(124,58,237,0.2)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.3)" }}
                    >
                      {clientName.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="text-center px-3">
                      <div className="w-10 h-10 rounded-xl mx-auto mb-1 flex items-center justify-center" style={{ background: "rgba(124,58,237,0.12)" }}>
                        <Sparkles size={18} style={{ color: "#7c3aed" }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                  <p className="font-heading font-bold text-xs" style={{ color: "var(--text-main)" }}>
                    {clientName || "Nome do cliente..."}
                  </p>
                  <p className="text-[11px] font-body mt-0.5" style={{ color: "var(--text-dim)" }}>
                    {selectedBMName ? `BM: ${selectedBMName.slice(0, 22)}…` : "Business Manager não selecionado"}
                  </p>
                  <p className="text-[11px] font-body mt-0.5" style={{ color: "var(--text-dim)" }}>
                    {selectedAccounts.length > 0
                      ? `${selectedAccounts.length} conta(s) vinculada(s)`
                      : "Sem contas vinculadas"}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border-color)" }} />

            {/* Completeness checklist */}
            <div>
              <p className="font-heading font-semibold text-[10px] tracking-widest mb-3" style={{ color: "var(--text-dimmer)" }}>
                COMPLETUDE
              </p>
              <div className="space-y-2.5">
                <ScoreItem label="Nome do cliente" done={canContinueStep1} />
                <ScoreItem label="Business Manager" done={canContinueStep2} />
                <ScoreItem label="Conta de anúncio" done={selectedAccounts.length > 0} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── StatusPill ─────────── */
function StatusPill({ status }: { status: string }) {
  const isHealthy = status === "healthy";
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-body px-2 py-0.5 rounded-full"
      style={{
        background: isHealthy ? "rgba(16,185,129,0.12)" : "rgba(245,166,35,0.12)",
        color: isHealthy ? "#10b981" : "#f5a623",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: isHealthy ? "#10b981" : "#f5a623" }} />
      {isHealthy ? "Saudável" : "Atenção"}
    </span>
  );
}