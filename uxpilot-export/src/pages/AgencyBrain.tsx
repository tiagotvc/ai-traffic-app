import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import CommandStrip from "@/components/CommandStrip";
import {
  Brain, Search, Lightbulb, Target, Zap,
  ArrowRight, ChevronRight, Clock, BarChart2, Globe, BookOpen, FlaskConical,
  ChevronDown, CheckCircle2, Calendar, X, ArrowLeft,
  TrendingUp, AlertTriangle, CheckCircle, Layers, Info
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Data ─────────────────────────────────────────────────── */

const tabs = ["Aprendizados", "Hipóteses", "Logs de pesquisa"] as const;
type Tab = (typeof tabs)[number];

const clients = ["Todos os clientes", "TechVision Ltda", "BrandForce Corp", "NovaMarca SA", "DigitalPrime"];

const sourceTags = [
  { label: "Meta Ads",     icon: BarChart2,    color: "#1877F2", bg: "rgba(24,119,242,0.08)"  },
  { label: "Agência",      icon: BookOpen,     color: "#7c3aed", bg: "rgba(124,58,237,0.08)"  },
  { label: "Mercado",      icon: Globe,        color: "#10b981", bg: "rgba(16,185,129,0.08)"  },
  { label: "Concorrência", icon: Target,       color: "#f5a623", bg: "rgba(245,166,35,0.08)"  },
  { label: "Hipótese",     icon: FlaskConical, color: "#6366f1", bg: "rgba(99,102,241,0.08)"  },
];

type Impact = "Alto" | "Médio" | "Baixo";

interface Learning {
  id: number;
  title: string;
  description: string;
  confidence: number;
  impact: Impact;
  tags: string[];
  evidence: string;
  sources: string[];
  validity: string;
  timeline: TimelineEvent[];
}

interface TimelineEvent {
  date: string;
  type: "discovery" | "validation" | "application" | "update" | "warning";
  title: string;
  description: string;
}

const learnings: Learning[] = [
  {
    id: 1,
    title: "Público novo performando melhor que lookalike antigo",
    description:
      "Públicos de interesse novos (Meta Ads) apresentaram CPA 24% menor e CTR 17% maior que lookalikes de 1% criados há mais de 6 meses.",
    confidence: 88,
    impact: "Alto",
    tags: ["Público", "CPA", "Lookalike"],
    evidence: "3 campanhas Meta Ads · públicos novos vs lookalike 1% antigo · CPA −24% · CTR +17%.",
    sources: ["Meta Ads", "Benchmark agência", "Tendência de mercado"],
    validity: "Válido até Ago 2025",
    timeline: [
      { date: "12 Jan 2025", type: "discovery", title: "Descoberta inicial", description: "Padrão identificado em 2 campanhas ativas com públicos novos vs. lookalike 1%." },
      { date: "28 Jan 2025", type: "validation", title: "Validação com dados ampliados", description: "3ª campanha confirmou CPA −24% e CTR +17%. Confiança elevada para 88%." },
      { date: "5 Fev 2025", type: "application", title: "Aplicado em conta TechVision", description: "Novo público criado e substituiu lookalike antigo na campanha principal." },
      { date: "20 Fev 2025", type: "update", title: "Revisão de confiança", description: "Dados de fevereiro confirmaram tendência. Validade estendida até Ago 2025." },
    ],
  },
  {
    id: 2,
    title: '"NOVO ZAP" parece melhorar CTR em campanhas de captação',
    description:
      'Campanhas com "NOVO ZAP" no nome do conjunto tiveram CTR 17% acima do baseline nas últimas 4 semanas no Meta Ads.',
    confidence: 75,
    impact: "Médio",
    tags: ["CTR", "Copy", "WhatsApp"],
    evidence: "3 campanhas Meta Ads ativas · CTR +17% · hook de urgência + canal direto.",
    sources: ["Meta Ads", "Padrão da agência"],
    validity: "Válido até Jul 2025",
    timeline: [
      { date: "3 Fev 2025", type: "discovery", title: "Hipótese levantada", description: "Equipe criativa notou padrão em hooks com menção ao WhatsApp." },
      { date: "18 Fev 2025", type: "validation", title: "Teste A/B iniciado", description: "3 campanhas paralelas com e sem 'NOVO ZAP' no conjunto." },
      { date: "28 Fev 2025", type: "warning", title: "Resultado parcial", description: "CTR +17% confirmado, mas volume ainda baixo para alta confiança." },
    ],
  },
  {
    id: 3,
    title: "Frequência acima de 3.5 degrada o CTR progressivamente",
    description:
      "Análise de 12 campanhas ativas mostra que CTR cai em média 22% quando a frequência ultrapassa 3.5 no mesmo período de 7 dias.",
    confidence: 91,
    impact: "Alto",
    tags: ["Frequência", "CTR", "Criativo"],
    evidence: "12 campanhas · frequência 3.5+ · queda de CTR média −22% em 7 dias.",
    sources: ["Meta Ads", "Benchmark agência"],
    validity: "Válido até Set 2025",
    timeline: [
      { date: "10 Dez 2024", type: "discovery", title: "Padrão identificado", description: "Análise retrospectiva de 12 campanhas revelou correlação forte entre frequência e queda de CTR." },
      { date: "5 Jan 2025", type: "validation", title: "Validação estatística", description: "Correlação de 0.87 entre frequência 3.5+ e queda de CTR em 7 dias." },
      { date: "15 Jan 2025", type: "application", title: "Regra de alerta implementada", description: "Sistema de alertas ativado para campanhas com frequência ≥ 3.5 em 7 dias." },
    ],
  },
  {
    id: 4,
    title: "Reels curtos (≤15s) têm CPL 19% menor que carrossel",
    description:
      "Comparativo entre formatos mostra superioridade do Reels curto em custo por lead em públicos frios, especialmente em mobile.",
    confidence: 83,
    impact: "Alto",
    tags: ["Criativo", "Reels", "CPL"],
    evidence: "Análise de formato em 8 campanhas ativas · CPL médio Reels R$14.20 vs carrossel R$17.50.",
    sources: ["Meta Ads", "Tendência de mercado"],
    validity: "Válido até Out 2025",
    timeline: [
      { date: "2 Jan 2025", type: "discovery", title: "Insight de mercado", description: "Benchmarks de mercado apontaram Reels como formato dominante em CPL para públicos frios." },
      { date: "20 Jan 2025", type: "validation", title: "Teste em 8 campanhas", description: "CPL médio Reels R$14.20 vs Carrossel R$17.50. Diferença de 19%." },
      { date: "1 Fev 2025", type: "application", title: "Priorização de Reels", description: "Diretriz de criativo atualizada: priorizar Reels ≤15s para públicos frios." },
    ],
  },
  {
    id: 5,
    title: "CBO supera ABO em contas com budget > R$5K/dia",
    description:
      "Em contas similares com budget diário acima de R$5.000, a estrutura CBO apresentou CPL 14% menor após 14 dias de aprendizado.",
    confidence: 68,
    impact: "Médio",
    tags: ["Budget", "CBO", "ABO"],
    evidence: "12 contas comparáveis · budget >R$5K · CPL CBO vs ABO −14% em 14 dias.",
    sources: ["Benchmark agência", "Hipótese"],
    validity: "Válido até Jun 2025",
    timeline: [
      { date: "15 Nov 2024", type: "discovery", title: "Hipótese inicial", description: "Gestor sênior levantou hipótese baseada em experiência com contas grandes." },
      { date: "10 Jan 2025", type: "validation", title: "Análise de 12 contas", description: "CPL CBO 14% menor após 14 dias de aprendizado em contas com budget >R$5K." },
      { date: "25 Jan 2025", type: "warning", title: "Ressalva identificada", description: "Resultado menos claro em contas com alta variação de sazonalidade." },
    ],
  },
];

interface Hypothesis {
  id: number;
  title: string;
  status: "Em teste" | "Confirmada" | "Refutada" | "Aguardando";
  confidence: number;
  impact: Impact;
  tags: string[];
  description: string;
  testPeriod: string;
}

const hypotheses: Hypothesis[] = [
  {
    id: 1,
    title: "Stories com contador regressivo aumentam CVR em campanhas de oferta",
    status: "Em teste",
    confidence: 55,
    impact: "Alto",
    tags: ["Stories", "CVR", "Urgência"],
    description: "Hipótese baseada em benchmarks de e-commerce. Teste A/B em andamento com 2 contas.",
    testPeriod: "Mar – Abr 2025",
  },
  {
    id: 2,
    title: "Orçamento mínimo de R$80/dia por conjunto melhora saída do aprendizado",
    status: "Confirmada",
    confidence: 82,
    impact: "Médio",
    tags: ["Budget", "Aprendizado", "Conjunto"],
    description: "Conjuntos com ≥ R$80/dia saíram do aprendizado 3 dias mais rápido que os com R$30–50/dia.",
    testPeriod: "Jan – Fev 2025",
  },
  {
    id: 3,
    title: "Pausar criativos na sexta > 18h reduz desperdício de budget",
    status: "Aguardando",
    confidence: 40,
    impact: "Baixo",
    tags: ["Scheduling", "Budget", "Criativo"],
    description: "Padrão observado em 2 contas — precisa validar escala.",
    testPeriod: "Abr – Mai 2025",
  },
  {
    id: 4,
    title: "Hook de dor supera hook de benefício em públicos frios B2C",
    status: "Refutada",
    confidence: 30,
    impact: "Médio",
    tags: ["Copy", "Hook", "Público Frio"],
    description: "Teste com 4 campanhas não mostrou diferença significativa. CTR variou apenas 3%.",
    testPeriod: "Dez 2024 – Jan 2025",
  },
];

/* ─── Source tag config ─────────────────────────────────────── */
const sourceConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  "Meta Ads":              { icon: BarChart2,    color: "#1877F2", bg: "rgba(24,119,242,0.09)"  },
  "Benchmark agência":     { icon: BookOpen,     color: "#7c3aed", bg: "rgba(124,58,237,0.09)"  },
  "Tendência de mercado":  { icon: Globe,        color: "#10b981", bg: "rgba(16,185,129,0.09)"  },
  "Padrão da agência":     { icon: BookOpen,     color: "#7c3aed", bg: "rgba(124,58,237,0.09)"  },
  "Hipótese":              { icon: FlaskConical, color: "#6366f1", bg: "rgba(99,102,241,0.09)"  },
};

const impactConfig: Record<Impact, { color: string; bg: string; border: string }> = {
  Alto:  { color: "#059669", bg: "rgba(5,150,105,0.10)",   border: "rgba(5,150,105,0.25)"   },
  Médio: { color: "#d97706", bg: "rgba(217,119,6,0.10)",   border: "rgba(217,119,6,0.25)"   },
  Baixo: { color: "#64748b", bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.20)" },
};

const hypothesisStatusConfig: Record<Hypothesis["status"], { color: string; bg: string; border: string }> = {
  "Em teste":   { color: "#f5a623", bg: "rgba(245,166,35,0.10)",  border: "rgba(245,166,35,0.25)"  },
  "Confirmada": { color: "#059669", bg: "rgba(5,150,105,0.10)",   border: "rgba(5,150,105,0.25)"   },
  "Refutada":   { color: "#ef4444", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.25)"   },
  "Aguardando": { color: "#6366f1", bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.25)"  },
};

const timelineTypeConfig: Record<TimelineEvent["type"], { icon: React.ElementType; color: string; bg: string }> = {
  discovery:   { icon: Lightbulb,     color: "#f5a623", bg: "rgba(245,166,35,0.12)"  },
  validation:  { icon: CheckCircle,   color: "#059669", bg: "rgba(5,150,105,0.12)"   },
  application: { icon: TrendingUp,    color: "#1877F2", bg: "rgba(24,119,242,0.12)"  },
  update:      { icon: Layers,        color: "#7c3aed", bg: "rgba(124,58,237,0.12)"  },
  warning:     { icon: AlertTriangle, color: "#ef4444", bg: "rgba(239,68,68,0.12)"   },
};

/* ─── Component ─────────────────────────────────────────────── */
export default function AgencyBrain() {
  const [activeTab, setActiveTab]     = useState<Tab>("Aprendizados");
  const [search, setSearch]           = useState("");
  const [expanded, setExpanded]       = useState<number | null>(null);
  const [timelineItem, setTimelineItem] = useState<Learning | null>(null);

  const filtered = learnings.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  const highImpact = learnings.filter((l) => l.impact === "Alto").length;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-bg)" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <CommandStrip onToggleEmpty={() => {}} isEmptyState={false} />

        <main
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        >
          {/* ── Page Header ── */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-body mb-1" style={{ color: "var(--text-dim)" }}>Agency Brain</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                  <Brain size={16} className="text-white" />
                </div>
                <h1 className="font-heading font-bold text-2xl" style={{ color: "var(--text-main)" }}>Agency Brain</h1>
              </div>
              <p className="text-sm font-body mt-1" style={{ color: "var(--text-dim)" }}>
                Conhecimento consolidado · Meta Ads, contas similares e sinais de mercado.
              </p>
            </div>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-heading font-semibold text-white shadow-sm hover:brightness-110 transition-all"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
            >
              Refinar pesquisas
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "rgba(255,255,255,0.22)" }}
              >
                2 pts IA
              </span>
            </button>
          </div>

          {/* ── Filter Row: Sources + IA Credits ── */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-xs font-body font-medium" style={{ color: "var(--text-dimmer)" }}>
              Fontes consultadas:
            </span>
            {sourceTags.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-body font-medium border"
                style={{ background: s.bg, color: s.color, borderColor: `${s.color}33` }}
              >
                <s.icon size={11} />
                {s.label}
              </span>
            ))}
            <div
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold border select-none"
              style={{
                background: "rgba(79,70,229,0.08)",
                borderColor: "rgba(79,70,229,0.22)",
                color: "#6366f1",
              }}
            >
              <Zap size={11} className="fill-indigo-500" />
              <span className="font-bold">496 / 500 créditos IA</span>
            </div>
          </div>

          {/* ── Filter Tabs Row + Search ── */}
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {tabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className="px-4 py-1.5 rounded-lg text-sm font-body font-medium transition-all"
                  style={{
                    background: activeTab === t ? "#f5a623" : "var(--surface-card)",
                    color: activeTab === t ? "#0f1419" : "var(--text-dim)",
                    border: activeTab === t ? "1px solid #f5a623" : "1px solid var(--border-color)",
                    fontWeight: activeTab === t ? 600 : 400,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ background: "var(--surface-card)", borderColor: "#f5a623", minWidth: 200 }}>
              <Search size={14} style={{ color: "var(--text-dimmer)" }} />
              <input
                type="text"
                placeholder="Buscar aprendizados..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none text-sm font-body w-full"
                style={{ color: "var(--text-main)" }}
              />
            </div>
          </div>

          {/* ── Info Banner ── */}
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl mb-5 text-sm font-body"
            style={{ background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.2)", color: "var(--text-dim)" }}
          >
            <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#f5a623" }} />
            <span>
              Aprendizados gerados com base em dados reais de{" "}
              <strong style={{ color: "#f5a623" }}>Meta Ads, benchmarks da agência e sinais de mercado</strong>. Aprendizados com confiança abaixo de 50% são exibidos apenas como hipóteses. Clique em um card para expandir os detalhes.
            </span>
          </div>

          {/* ── Cards ─────────────────────────────────────────── */}
          <div className="space-y-3">
            {activeTab === "Aprendizados" && (
              <>
                {filtered.map((item, i) => (
                  <LearningCard
                    key={item.id}
                    item={item}
                    expanded={expanded === item.id}
                    onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
                    onTimeline={() => setTimelineItem(item)}
                    index={i}
                  />
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-20">
                    <Brain size={36} className="mx-auto mb-3" style={{ color: "var(--text-dimmer)" }} />
                    <p className="font-heading font-semibold" style={{ color: "var(--text-dim)" }}>
                      Nenhum aprendizado encontrado
                    </p>
                    <p className="text-sm font-body mt-1" style={{ color: "var(--text-dimmer)" }}>
                      Tente outra busca ou aguarde a análise.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === "Hipóteses" && (
              <HypothesesTab />
            )}

            {activeTab === "Logs de pesquisa" && (
              <div className="text-center py-20">
                <Clock size={36} className="mx-auto mb-3" style={{ color: "var(--text-dimmer)" }} />
                <p className="font-heading font-semibold" style={{ color: "var(--text-dim)" }}>
                  Logs de pesquisa
                </p>
                <p className="text-sm font-body mt-1" style={{ color: "var(--text-dimmer)" }}>
                  Histórico de consultas do Brain aparece aqui.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ── Timeline Slide Panel ───────────────────────────────── */}
      {timelineItem && (
        <TimelinePanel item={timelineItem} onClose={() => setTimelineItem(null)} />
      )}
    </div>
  );
}

/* ─── Hypotheses Tab ─────────────────────────────────────────── */
function HypothesesTab() {
  return (
    <div className="space-y-3">
      {hypotheses.map((h, i) => {
        const sc = hypothesisStatusConfig[h.status];
        const imp = impactConfig[h.impact];
        return (
          <div
            key={h.id}
            className="rounded-xl border overflow-hidden animate-fade-up transition-all duration-200"
            style={{
              background: "var(--surface-card)",
              borderColor: "var(--border-color)",
              animationDelay: `${i * 55}ms`,
              animationFillMode: "both",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(250,204,21,0.4)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-heading font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                      style={{ background: "rgba(99,102,241,0.10)", color: "#6366f1", borderColor: "rgba(99,102,241,0.22)" }}
                    >
                      <FlaskConical size={9} />
                      HIPÓTESE
                    </span>
                    <span
                      className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full border"
                      style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}
                    >
                      {h.status.toUpperCase()}
                    </span>
                    <span
                      className="text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full border"
                      style={{ color: imp.color, background: imp.bg, borderColor: imp.border }}
                    >
                      Impacto {h.impact}
                    </span>
                  </div>
                  <h2 className="text-sm font-heading font-semibold leading-snug mb-1.5" style={{ color: "var(--text-main)" }}>
                    {h.title}
                  </h2>
                  <p className="text-sm font-body leading-relaxed" style={{ color: "var(--text-dim)" }}>
                    {h.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>Confiança</span>
                  <span className="text-xs font-heading font-bold" style={{ color: "var(--text-main)" }}>{h.confidence}%</span>
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-hover)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${h.confidence}%`,
                        background: h.confidence >= 75 ? "linear-gradient(90deg,#FACC15,#f5a623)" : h.confidence >= 55 ? "#4f46e5" : "var(--text-dimmer)",
                      }}
                    />
                  </div>
                </div>
                <span style={{ color: "var(--border-hover)" }}>·</span>
                <div className="flex items-center gap-1">
                  <Calendar size={11} style={{ color: "var(--text-dimmer)" }} />
                  <span className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>{h.testPeriod}</span>
                </div>
                <div className="flex items-center gap-1.5 ml-1 flex-wrap">
                  {h.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-body px-2 py-0.5 rounded-full border"
                      style={{ background: "rgba(250,204,21,0.07)", color: "var(--amber)", borderColor: "rgba(250,204,21,0.18)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Timeline Panel ─────────────────────────────────────────── */
function TimelinePanel({ item, onClose }: { item: Learning; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      {/* Slide-in panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col shadow-2xl"
        style={{
          width: "420px",
          background: "var(--surface-card)",
          borderLeft: "1px solid var(--border-color)",
        }}
      >
        {/* Panel Header */}
        <div
          className="flex items-start justify-between px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                <Brain size={14} className="text-white" />
              </div>
              <span className="text-xs font-heading font-bold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
                Timeline do Aprendizado
              </span>
            </div>
            <h2 className="text-sm font-heading font-semibold leading-snug" style={{ color: "var(--text-main)" }}>
              {item.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ color: "var(--text-dim)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--row-hover)")}
            onMouseLeave={e => (e.currentTarget.style.background = "")}
          >
            <X size={15} />
          </button>
        </div>

        {/* Meta info */}
        <div
          className="px-6 py-3 border-b flex items-center gap-4 flex-wrap flex-shrink-0"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>Confiança</span>
            <span className="text-xs font-heading font-bold" style={{ color: "var(--text-main)" }}>{item.confidence}%</span>
            <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-hover)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${item.confidence}%`,
                  background: item.confidence >= 85 ? "linear-gradient(90deg,#FACC15,#f5a623)" : "#4f46e5",
                }}
              />
            </div>
          </div>
          <span style={{ color: "var(--border-hover)" }}>·</span>
          <div className="flex items-center gap-1">
            <Calendar size={11} style={{ color: "var(--text-dimmer)" }} />
            <span className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>{item.validity}</span>
          </div>
        </div>

        {/* Timeline events */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}>
          <div className="relative">
            {/* vertical line */}
            <div
              className="absolute left-[19px] top-2 bottom-2 w-px"
              style={{ background: "var(--border-color)" }}
            />

            <div className="space-y-5">
              {item.timeline.map((event, i) => {
                const cfg = timelineTypeConfig[event.type];
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex gap-4 relative">
                    {/* dot */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2"
                      style={{
                        background: cfg.bg,
                        borderColor: cfg.color + "44",
                      }}
                    >
                      <Icon size={16} style={{ color: cfg.color }} />
                    </div>
                    {/* content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-body px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {event.date}
                        </span>
                      </div>
                      <h4 className="text-sm font-heading font-semibold mb-1" style={{ color: "var(--text-main)" }}>
                        {event.title}
                      </h4>
                      <p className="text-xs font-body leading-relaxed" style={{ color: "var(--text-dim)" }}>
                        {event.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div
          className="px-6 py-4 border-t flex items-center gap-3 flex-shrink-0"
          style={{ borderColor: "var(--border-color)" }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium border transition-all"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)", background: "transparent" }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--border-hover)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
          >
            <ArrowLeft size={14} />
            Voltar
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-heading font-semibold text-white hover:brightness-110 transition-all shadow-sm ml-auto"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            Gerar hipótese
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Learning Card ─────────────────────────────────────────── */
function LearningCard({
  item,
  expanded,
  onToggle,
  onTimeline,
  index,
}: {
  item: Learning;
  expanded: boolean;
  onToggle: () => void;
  onTimeline: () => void;
  index: number;
}) {
  const imp = impactConfig[item.impact];

  return (
    <div
      className="rounded-xl border cursor-pointer overflow-hidden animate-fade-up transition-all duration-200"
      style={{
        background: "var(--surface-card)",
        borderColor: expanded ? "#FACC15" : "var(--border-color)",
        boxShadow: expanded ? "0 0 0 1px rgba(250,204,21,0.25), 0 8px 24px rgba(0,0,0,0.12)" : "none",
        animationDelay: `${index * 55}ms`,
        animationFillMode: "both",
      }}
      onMouseEnter={e => {
        if (!expanded) {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(250,204,21,0.4)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)";
        }
      }}
      onMouseLeave={e => {
        if (!expanded) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
        }
      }}
      onClick={onToggle}
    >
      {/* Amber top accent bar */}
      <div
        className="h-0.5 w-full"
        style={{ background: expanded ? "linear-gradient(90deg,#FACC15,#f5a623)" : "transparent" }}
      />

      {/* Card Body */}
      <div className="px-5 py-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-heading font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                style={{
                  background: "rgba(124,58,237,0.10)",
                  color: "#7c3aed",
                  borderColor: "rgba(124,58,237,0.22)",
                }}
              >
                <Lightbulb size={9} />
                APRENDIZADO
              </span>

              <span
                className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full border"
                style={{
                  color: imp.color,
                  background: imp.bg,
                  borderColor: imp.border,
                }}
              >
                ATIVO
              </span>

              <span
                className="text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full border"
                style={{ color: imp.color, background: imp.bg, borderColor: imp.border }}
              >
                Impacto {item.impact}
              </span>
            </div>

            <h2 className="text-sm font-heading font-semibold leading-snug mb-1.5" style={{ color: "var(--text-main)" }}>
              {item.title}
            </h2>
            <p className="text-sm font-body leading-relaxed" style={{ color: "var(--text-dim)" }}>
              {item.description}
            </p>
          </div>

          <ChevronRight
            size={16}
            className={cn("flex-shrink-0 mt-0.5 transition-transform duration-200", expanded && "rotate-90")}
            style={{ color: expanded ? "#FACC15" : "var(--text-dimmer)" }}
          />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-3.5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>Confiança</span>
            <span className="text-xs font-heading font-bold" style={{ color: "var(--text-main)" }}>
              {item.confidence}%
            </span>
            <div
              className="w-16 h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--border-hover)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${item.confidence}%`,
                  background: item.confidence >= 85
                    ? "linear-gradient(90deg,#FACC15,#f5a623)"
                    : item.confidence >= 70
                    ? "#4f46e5"
                    : "var(--text-dimmer)",
                }}
              />
            </div>
          </div>

          <span style={{ color: "var(--border-hover)" }}>·</span>

          <div className="flex items-center gap-1">
            <Calendar size={11} style={{ color: "var(--text-dimmer)" }} />
            <span className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>{item.validity}</span>
          </div>

          <div className="flex items-center gap-1.5 ml-1 flex-wrap">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-body px-2 py-0.5 rounded-full border"
                style={{
                  background: "rgba(250,204,21,0.07)",
                  color: "var(--amber)",
                  borderColor: "rgba(250,204,21,0.18)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p
          className="text-xs font-body mt-3 leading-relaxed border-t pt-3"
          style={{ color: "var(--text-dimmer)", borderColor: "var(--border-color)" }}
        >
          {item.evidence}
        </p>

        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {item.sources.map((src) => {
            const cfg = sourceConfig[src] || { icon: Globe, color: "#6b7280", bg: "rgba(107,114,128,0.09)" };
            const Icon = cfg.icon;
            return (
              <span
                key={src}
                className="inline-flex items-center gap-1 text-[11px] font-body px-2.5 py-1 rounded-full font-medium border"
                style={{
                  background: cfg.bg,
                  color: cfg.color,
                  borderColor: `${cfg.color}22`,
                }}
              >
                <Icon size={10} />
                {src}
              </span>
            );
          })}
        </div>
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div
          className="px-5 py-3.5 border-t flex items-center gap-2.5"
          style={{ borderColor: "rgba(250,204,21,0.2)", background: "rgba(250,204,21,0.04)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onTimeline}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-heading font-semibold border transition-all hover:brightness-110"
            style={{
              background: "var(--surface-bg)",
              borderColor: "#f5a623",
              color: "#f5a623",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(245,166,35,0.08)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "var(--surface-bg)";
            }}
          >
            <Clock size={12} />
            Ver Timeline
          </button>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-heading font-semibold text-white hover:brightness-110 transition-all shadow-sm"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            Gerar hipótese
            <ArrowRight size={13} />
          </button>
          <span
            className="ml-auto text-[10px] font-body px-2 py-1 rounded-full"
            style={{ background: "rgba(79,70,229,0.10)", color: "#6366f1" }}
          >
            2 pts IA
          </span>
        </div>
      )}
    </div>
  );
}