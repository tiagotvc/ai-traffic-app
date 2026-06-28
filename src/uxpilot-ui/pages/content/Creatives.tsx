"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Trophy,
  SlidersHorizontal,
  ChevronDown,
  X,
  Star,
  RefreshCw,
  Play,
  Monitor,
  Smartphone,
  Instagram,
  BookImage,
  ExternalLink,
  BarChart2,
  Search,
  TrendingUp,
  Eye,
  Video,
  Image,
  LayoutGrid,
  Filter,
} from "lucide-react";

import { FilterSelectDropdown } from "@/components/FilterSelectDropdown";
import { CreativeRankingCard, CreativeRankingCardsSkeleton } from "@/components/creatives/CreativeRankingCard";
import { DsInfoBanner } from "@/design-system";
import type { UxCreativeCard } from "@/uxpilot-ui/adapters/creatives-mappers";

// ─── Data ─────────────────────────────────────────────────────────────────────
const clients = ["Gabi Dawson", "TechVision", "BrandForce", "NovaMarca"];
const periods = ["Últimos 7 dias", "Últimos 14 dias", "Últimos 30 dias", "Últimos 90 dias"];
const campaignTypes = ["Todas", "Vendas", "Lead WhatsApp", "Lead no site", "Alcance", "Geral"];
const filterTabs = ["Todos", "Vendas", "Lead WhatsApp", "Lead no site", "Alcance", "Geral"];

interface CreativeCard {
  id: number;
  rank: number;
  title: string;
  type: "Video" | "Imagem" | "Carrossel";
  campaignType: string;
  campaignsUsed: number;
  status: "Ativo" | "Pausado" | "Encerrado";
  img_url: string;
  score: number;
  metrics: {
    roas: string;
    ctr: string;
    cpl: string;
    cpm: string;
    impressoes: string;
    investido: string;
  };
}

const creativesData: CreativeCard[] = [
  {
    id: 1, rank: 1,
    title: "Criativo_Video_Hook01",
    type: "Video",
    campaignType: "Vendas",
    campaignsUsed: 2,
    status: "Ativo",
    img_url: "https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_50be79c1b3_6e6db494169be619.png",
    score: 97,
    metrics: { roas: "6.8×", ctr: "4.2%", cpl: "R$11,40", cpm: "R$13,80", impressoes: "280K", investido: "R$3.864" },
  },
  {
    id: 2, rank: 2,
    title: "Banner_Oferta_Especial",
    type: "Imagem",
    campaignType: "Vendas",
    campaignsUsed: 1,
    status: "Ativo",
    img_url: "https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_da823ac95b_1dd9f97c42ebbfd1.png",
    score: 91,
    metrics: { roas: "5.9×", ctr: "3.8%", cpl: "R$13,20", cpm: "R$14,90", impressoes: "210K", investido: "R$3.129" },
  },
  {
    id: 3, rank: 3,
    title: "Carousel_Produtos_5Car",
    type: "Carrossel",
    campaignType: "Vendas",
    campaignsUsed: 2,
    status: "Ativo",
    img_url: "https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_82bfbbea4d_e47745b49f9f77b5.png",
    score: 84,
    metrics: { roas: "5.2×", ctr: "3.1%", cpl: "R$15,80", cpm: "R$16,40", impressoes: "175K", investido: "R$2.870" },
  },
  {
    id: 4, rank: 4,
    title: "Video_Depoimento_Cliente",
    type: "Video",
    campaignType: "Lead WhatsApp",
    campaignsUsed: 1,
    status: "Ativo",
    img_url: "https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_e411b6f2de_7c4690ee57a8758d.png",
    score: 76,
    metrics: { roas: "4.1×", ctr: "2.9%", cpl: "R$18,60", cpm: "R$19,20", impressoes: "142K", investido: "R$2.726" },
  },
  {
    id: 5, rank: 5,
    title: "Banner_Simples_Texto_F",
    type: "Imagem",
    campaignType: "Alcance",
    campaignsUsed: 3,
    status: "Ativo",
    img_url: "https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_8def51769b_6fd7cd332250c368.png",
    score: 68,
    metrics: { roas: "3.8×", ctr: "2.4%", cpl: "R$22,40", cpm: "R$21,80", impressoes: "318K", investido: "R$6.932" },
  },
  {
    id: 6, rank: 6,
    title: "Reels_15s_Produto_Dest",
    type: "Video",
    campaignType: "Vendas",
    campaignsUsed: 1,
    status: "Pausado",
    img_url: "https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_f545b4e263_9d33481710187ba6.png",
    score: 58,
    metrics: { roas: "3.2×", ctr: "1.9%", cpl: "R$26,10", cpm: "R$24,60", impressoes: "98K", investido: "R$2.411" },
  },
  {
    id: 7, rank: 7,
    title: "Story_Countdown_Oferta",
    type: "Imagem",
    campaignType: "Lead no site",
    campaignsUsed: 2,
    status: "Pausado",
    img_url: "https://storage.googleapis.com/uxpilot-auth.appspot.com/gen_79d66a7a6f_9cecf3b9c371681b.png",
    score: 44,
    metrics: { roas: "2.7×", ctr: "1.4%", cpl: "R$31,20", cpm: "R$27,40", impressoes: "76K", investido: "R$2.082" },
  },
];

// ─── Score helpers ─────────────────────────────────────────────────────────────
function getScoreColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f5a623";
  return "#ef4444";
}

function getScoreLabel(score: number) {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bom";
  return "Fraco";
}

// ─── Criteria Modal ───────────────────────────────────────────────────────────
type MetricOption = { label: string; value: string };

const metricsByType: Record<string, MetricOption[]> = {
  Vendas: [
    { label: "ROAS", value: "roas" },
    { label: "CPA", value: "cpa" },
    { label: "Taxa de conversão", value: "conv_rate" },
  ],
  "Lead WhatsApp": [
    { label: "Custo por mensagem", value: "cpm_msg" },
    { label: "CTR", value: "ctr" },
    { label: "CPM", value: "cpm" },
  ],
  "Lead no site": [
    { label: "Custo por conversão", value: "cpc_conv" },
    { label: "CTR", value: "ctr" },
    { label: "CPM", value: "cpm" },
  ],
  Alcance: [
    { label: "CPM", value: "cpm" },
    { label: "Frequência", value: "frequency" },
  ],
  Geral: [
    { label: "CTR", value: "ctr" },
    { label: "CPM", value: "cpm" },
    { label: "CPC", value: "cpc" },
  ],
};

const directions = [
  { label: "Maior é melhor", value: "higher" },
  { label: "Menor é melhor", value: "lower" },
];

const criteriaRows = [
  { type: "Vendas", defaultMetric: "roas", defaultDir: "higher" },
  { type: "Lead WhatsApp", defaultMetric: "cpm_msg", defaultDir: "lower" },
  { type: "Lead no site", defaultMetric: "cpc_conv", defaultDir: "lower" },
  { type: "Alcance", defaultMetric: "cpm", defaultDir: "lower" },
  { type: "Geral", defaultMetric: "ctr", defaultDir: "higher" },
];

function CriteriaModal({ onClose }: { onClose: () => void }) {
  const [minImpressions, setMinImpressions] = useState("100");
  const [criteria, setCriteria] = useState(
    Object.fromEntries(criteriaRows.map((r) => [r.type, { metric: r.defaultMetric, direction: r.defaultDir }]))
  );
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const getMetricLabel = (type: string) =>
    (metricsByType[type] ?? []).find((o) => o.value === criteria[type]?.metric)?.label ?? criteria[type]?.metric;
  const getDirLabel = (type: string) =>
    directions.find((d) => d.value === criteria[type]?.direction)?.label ?? "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)" }}>
        <div className="flex items-start justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div>
            <h2 className="font-heading font-bold text-lg" style={{ color: "var(--text-main)" }}>Critérios de ranqueamento</h2>
            <p className="text-sm font-body mt-1" style={{ color: "var(--text-dim)" }}>Defina, por tipo de campanha, qual métrica decide o melhor criativo.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--row-hover)" }}>
            <X size={15} style={{ color: "var(--text-dim)" }} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3 max-h-[65vh] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <label className="text-sm font-body" style={{ color: "var(--text-dim)" }}>Mínimo de impressões para entrar no ranking</label>
            <input
              type="number" value={minImpressions} onChange={e => setMinImpressions(e.target.value)}
              className="w-24 px-3 py-2 rounded-lg text-sm font-body font-semibold outline-none text-right border"
              style={{ borderColor: "#f5a623", color: "var(--text-main)", background: "var(--surface-bg)" }}
            />
          </div>
          {criteriaRows.map((row) => (
            <div key={row.type} className="p-4 rounded-xl space-y-3" style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
              <div className="flex items-center gap-4">
                <span className="text-sm font-body font-semibold w-32 flex-shrink-0" style={{ color: "var(--text-main)" }}>{row.type}</span>
                <div className="relative flex-1" onClick={() => setOpenDropdown(openDropdown === `${row.type}-metric` ? null : `${row.type}-metric`)}>
                  <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-body border" style={{ background: "var(--surface-card)", borderColor: "#f5a623", color: "var(--text-main)" }}>
                    <span>{getMetricLabel(row.type)}</span>
                    <ChevronDown size={14} style={{ color: "#f5a623" }} />
                  </button>
                  {openDropdown === `${row.type}-metric` && (
                    <div className="absolute top-full mt-1 left-0 z-50 rounded-xl shadow-lg overflow-hidden w-full" style={{ background: "var(--dropdown-bg)", border: "1px solid var(--border-color)" }}>
                      {(metricsByType[row.type] ?? []).map((opt) => (
                        <button key={opt.value} className="w-full text-left px-3 py-2.5 text-sm font-body"
                          style={{ color: criteria[row.type]?.metric === opt.value ? "#7c3aed" : "var(--text-main)", background: "transparent" }}
                          onClick={(e) => { e.stopPropagation(); setCriteria(p => ({ ...p, [row.type]: { ...p[row.type], metric: opt.value } })); setOpenDropdown(null); }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="relative w-44" onClick={() => setOpenDropdown(openDropdown === `${row.type}-dir` ? null : `${row.type}-dir`)}>
                <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-body border" style={{ background: "var(--surface-card)", borderColor: "#f5a623", color: "var(--text-main)" }}>
                  <span>{getDirLabel(row.type)}</span>
                  <ChevronDown size={14} style={{ color: "#f5a623" }} />
                </button>
                {openDropdown === `${row.type}-dir` && (
                  <div className="absolute top-full mt-1 left-0 z-50 rounded-xl shadow-lg overflow-hidden w-full" style={{ background: "var(--dropdown-bg)", border: "1px solid var(--border-color)" }}>
                    {directions.map((d) => (
                      <button key={d.value} className="w-full text-left px-3 py-2.5 text-sm font-body"
                        style={{ color: criteria[row.type]?.direction === d.value ? "#7c3aed" : "var(--text-main)", background: "transparent" }}
                        onClick={(e) => { e.stopPropagation(); setCriteria(p => ({ ...p, [row.type]: { ...p[row.type], direction: d.value } })); setOpenDropdown(null); }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid var(--border-color)" }}>
          <button className="text-sm font-body" style={{ color: "var(--text-dim)" }}>Restaurar padrão</button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-body font-medium border" style={{ borderColor: "var(--border-color)", color: "var(--text-dim)", background: "var(--surface-card)" }}>Cancelar</button>
            <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-heading font-semibold" style={{ background: "#7c3aed", color: "#fff" }}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Modal ─────────────────────────────────────────────────────────────
type MainTab = "Anúncio" | "Copy" | "Onde é usado";
type PlatformTab = "Feed" | "Instagram" | "Stories";

function PreviewModal({ creative, onClose }: { creative: CreativeCard; onClose: () => void }) {
  const [mainTab, setMainTab] = useState<MainTab>("Anúncio");
  const [platformTab, setPlatformTab] = useState<PlatformTab>("Feed");

  const mainTabs: MainTab[] = ["Anúncio", "Copy", "Onde é usado"];
  const platformTabs: PlatformTab[] = ["Feed", "Instagram", "Stories"];

  const scoreColor = getScoreColor(creative.score);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[720px] rounded-2xl shadow-2xl flex flex-col"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)", maxHeight: "92vh" }}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Rank badge */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-xs flex-shrink-0"
              style={{ background: creative.rank === 1 ? "#f5a623" : "var(--surface-bg)", color: creative.rank === 1 ? "#fff" : "var(--text-dim)", border: creative.rank !== 1 ? "1px solid var(--border-color)" : "none" }}
            >
              {creative.rank === 1 ? <Star size={13} fill="#fff" color="#fff" /> : `#${creative.rank}`}
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-semibold text-base truncate pr-2" style={{ color: "var(--text-main)" }}>
                {creative.title}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {/* Type badge */}
                <span className="inline-flex items-center gap-1 text-xs font-body px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
                  {creative.type === "Video" && <Video size={10} />}
                  {creative.type === "Imagem" && <Image size={10} />}
                  {creative.type === "Carrossel" && <LayoutGrid size={10} />}
                  {creative.type}
                </span>
                {/* Campaign type */}
                <span className="text-xs font-body px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: "#a78bfa" }}>
                  {creative.campaignType}
                </span>
                {/* Status */}
                <span
                  className="text-xs font-body font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: creative.status === "Ativo" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)",
                    color: creative.status === "Ativo" ? "#10b981" : "#ef4444",
                  }}
                >
                  ● {creative.status}
                </span>
                {/* Score pill */}
                <span className="text-xs font-heading font-bold px-2.5 py-0.5 rounded-full" style={{ background: `${scoreColor}20`, color: scoreColor }}>
                  Score {creative.score}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ml-3"
            style={{ background: "var(--row-hover)" }}
          >
            <X size={16} style={{ color: "var(--text-dim)" }} />
          </button>
        </div>

        {/* ── Key Metrics Strip ── */}
        <div className="px-6 py-3 flex items-center gap-4 flex-shrink-0 flex-wrap" style={{ borderBottom: "1px solid var(--border-color)", background: "var(--surface-bg)" }}>
          {[
            { label: "ROAS", value: creative.metrics.roas, color: "#10b981" },
            { label: "CTR", value: creative.metrics.ctr, color: "var(--text-main)" },
            { label: "CPL", value: creative.metrics.cpl, color: "var(--text-main)" },
            { label: "CPM", value: creative.metrics.cpm, color: "var(--text-main)" },
            { label: "Impressões", value: creative.metrics.impressoes, color: "var(--text-main)" },
            { label: "Investido", value: creative.metrics.investido, color: "#f5a623" },
          ].map((m) => (
            <div key={m.label} className="flex flex-col">
              <span className="text-[10px] font-body font-semibold uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>{m.label}</span>
              <span className="text-sm font-heading font-bold" style={{ color: m.color }}>{m.value}</span>
            </div>
          ))}
        </div>

        {/* ── Main Tabs ── */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-0 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-color)" }}>
          {mainTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className="px-4 py-2 text-sm font-body font-medium rounded-t-lg transition-all"
              style={{
                color: mainTab === tab ? "#7c3aed" : "var(--text-dim)",
                background: mainTab === tab ? "rgba(124,58,237,0.08)" : "transparent",
                borderBottom: mainTab === tab ? "2px solid #7c3aed" : "2px solid transparent",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Modal Body ── */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {/* Anúncio tab */}
          {mainTab === "Anúncio" && (
            <div className="px-6 py-5">
              {/* Platform Sub-tabs */}
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                {platformTabs.map((pt) => (
                  <button
                    key={pt}
                    onClick={() => setPlatformTab(pt)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-body transition-all border"
                    style={{
                      background: platformTab === pt ? "#7c3aed" : "var(--surface-bg)",
                      color: platformTab === pt ? "#fff" : "var(--text-dim)",
                      borderColor: platformTab === pt ? "#7c3aed" : "var(--border-color)",
                      fontWeight: platformTab === pt ? 600 : 400,
                    }}
                  >
                    {pt === "Feed" && <Monitor size={13} />}
                    {pt === "Instagram" && <Instagram size={13} />}
                    {pt === "Stories" && <BookImage size={13} />}
                    {pt}
                  </button>
                ))}
              </div>

              {/* Ad Preview Container */}
              <div
                className="mx-auto rounded-2xl overflow-hidden shadow-lg"
                style={{
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.1)",
                  maxWidth: platformTab === "Feed" ? "100%" : 360,
                }}
              >
                {/* Fake FB/IG post header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ background: "#fff" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-sm text-white" style={{ background: "#7c3aed" }}>GD</div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Instituto Gabriela Dawson</p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>Anúncio ·</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold leading-none" style={{ color: "#64748b", letterSpacing: 1 }}>···</span>
                    <X size={16} style={{ color: "#64748b" }} />
                  </div>
                </div>

                {/* Ad copy */}
                <div className="px-4 pb-3" style={{ background: "#fff" }}>
                  <p className="text-sm" style={{ color: "#0f172a", lineHeight: 1.55 }}>
                    🔥 ÚLTIMAS VAGAS: Curso de Harmonização Glútea para profissionais da estética! 🍑💉
                  </p>
                  <button className="text-sm font-semibold mt-1" style={{ color: "#1877f2" }}>...Ver mais</button>
                </div>

                {/* Image/Video thumbnail */}
                <div
                  className="relative overflow-hidden"
                  style={{
                    aspectRatio: platformTab === "Stories" ? "9/16" : "4/5",
                    maxHeight: platformTab === "Stories" ? 480 : 340,
                  }}
                >
                  <img
                    src={creative.img_url}
                    alt={creative.title}
                    className="w-full h-full object-cover"
                  />
                  {creative.type === "Video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
                        <Play size={22} fill="#fff" style={{ color: "#fff", marginLeft: 3 }} />
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 px-4 py-3" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
                    <p className="text-white font-bold text-lg leading-tight">Imersão clínica em</p>
                    <p className="text-white font-bold text-lg leading-tight">harmonização 🔥</p>
                  </div>
                </div>

                {/* CTA Bar */}
                <div className="flex items-center justify-between px-4 py-3" style={{ background: "#f0f2f5", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#65676b" }}>INSTITUTOGABRIELADAWSON.COM.BR</p>
                    <p className="text-sm font-semibold" style={{ color: "#050505" }}>Inscreva-se agora →</p>
                  </div>
                  <button className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "#1877f2", color: "#fff" }}>
                    Saiba mais
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Copy tab */}
          {mainTab === "Copy" && (
            <div className="px-6 py-6 space-y-4">
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                <p className="text-xs font-body font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-dimmer)" }}>Texto principal</p>
                <p className="text-sm font-body" style={{ color: "var(--text-main)", lineHeight: 1.7 }}>
                  🔥 ÚLTIMAS VAGAS: Curso de Harmonização Glútea para profissionais da estética! 🍑💉 A oportunidade de elevar sua carreira com imersão clínica prática e certificação reconhecida. Vagas limitadas!
                </p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                <p className="text-xs font-body font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-dimmer)" }}>Título do anúncio</p>
                <p className="text-sm font-body font-semibold" style={{ color: "var(--text-main)" }}>Inscreva-se agora →</p>
              </div>
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                <p className="text-xs font-body font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-dimmer)" }}>URL de destino</p>
                <a href="#" className="text-sm font-body flex items-center gap-1.5" style={{ color: "#7c3aed" }}>
                  institutogabrieladawson.com.br/curso-glutea
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* Onde é usado tab */}
          {mainTab === "Onde é usado" && (
            <div className="px-6 py-6 space-y-3">
              <p className="text-sm font-body mb-4" style={{ color: "var(--text-dim)" }}>
                Este criativo está sendo usado em <strong style={{ color: "var(--text-main)" }}>{creative.campaignsUsed} campanha(s)</strong>:
              </p>
              {Array.from({ length: creative.campaignsUsed }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.12)" }}>
                      <BarChart2 size={15} style={{ color: "#7c3aed" }} />
                    </div>
                    <div>
                      <p className="text-sm font-body font-semibold" style={{ color: "var(--text-main)" }}>
                        {i === 0 ? "LEAD_Site_Formulario_Jun26" : i === 1 ? "LEAD_Site_Retargeting_Jul26" : "Vendas_Prospeccao_Jul26"}
                      </p>
                      <p className="text-xs font-body" style={{ color: "var(--text-dim)" }}>{creative.campaignType}</p>
                    </div>
                  </div>
                  <span className="text-xs font-body font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>Ativa</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border-color)" }}>
          <button className="flex items-center gap-2 text-sm font-body font-medium px-4 py-2 rounded-lg border" style={{ borderColor: "var(--border-color)", color: "var(--text-dim)", background: "var(--surface-bg)" }}>
            <BarChart2 size={14} />
            Ver relatório completo
          </button>
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-heading font-semibold" style={{ background: "#7c3aed", color: "#fff" }}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Creative Card Item ─────────────────────────────────────────────────────────
function CreativeCardItem({
  creative,
  onPreview,
  onCompare
}: {
  creative: CreativeCard;
  onPreview: () => void;
  onCompare?: () => void;
}) {
  const isFirst = creative.rank === 1;
  const isTop3 = creative.rank <= 3;
  const scoreColor = getScoreColor(creative.score);
  const scoreLabel = getScoreLabel(creative.score);

  const rankColors = ["#f5a623", "#94a3b8", "#cd7c2f"];

  return (
    <div
      className="rounded-xl overflow-hidden transition-all hover:translate-y-[-2px]"
      style={{
        background: "var(--surface-card)",
        border: isFirst ? "1.5px solid rgba(245,166,35,0.5)" : "1px solid var(--border-color)",
        boxShadow: isFirst
          ? "0 4px 24px rgba(245,166,35,0.1)"
          : "0 1px 6px rgba(0,0,0,0.06)",
        transition: "all 0.2s ease",
      }}
    >
      {/* ── Thumbnail Section ── */}
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-[#0f1419]">
        <img
          src={creative.img_url ?? undefined}
          alt={creative.title}
          decoding="async"
          className="max-h-full max-w-full object-contain object-center"
        />
        {/* Gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)" }}
        />

        {/* Rank badge */}
        <div
          className="absolute left-3 top-3 z-[2] flex h-8 w-8 items-center justify-center rounded-full font-heading text-xs font-bold shadow-lg"
          style={{
            background: isTop3 ? rankColors[creative.rank - 1] : "rgba(15,20,25,0.7)",
            color: "#fff",
            border: "2px solid rgba(255,255,255,0.3)",
          }}
        >
          {isFirst ? <Star size={13} fill="#fff" color="#fff" /> : `#${creative.rank}`}
        </div>

        {/* Type badge */}
        <div
          className="absolute right-3 top-3 z-[2] flex items-center gap-1 rounded-full px-2 py-1 text-xs font-body font-semibold"
          style={{ background: "rgba(0,0,0,0.6)", color: "#fff", backdropFilter: "blur(4px)" }}
        >
          {creative.type === "Video" && <Video size={11} />}
          {creative.type === "Imagem" && <Image size={11} />}
          {creative.type === "Carrossel" && <LayoutGrid size={11} />}
          {creative.type}
        </div>

        {/* Status badge */}
        <div
          className="absolute bottom-3 right-3 z-[2] flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-body font-semibold"
          style={{
            background: creative.status === "Ativo" ? "rgba(16,185,129,0.85)" : "rgba(239,68,68,0.85)",
            color: "#fff",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
          {creative.status}
        </div>

        {/* Campaign type badge */}
        <div
          className="absolute bottom-3 left-3 z-[2] rounded-full px-2.5 py-1 text-xs font-body font-medium"
          style={{ background: "rgba(124,58,237,0.8)", color: "#fff" }}
        >
          {creative.campaignType}
        </div>
      </div>

      {/* ── Card Body ── */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <p className="text-sm font-body font-semibold leading-snug line-clamp-1 mb-1" style={{ color: "var(--text-main)" }}>
          {creative.title}
        </p>
        <p className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>
          Usado em {creative.campaignsUsed} campanha(s)
        </p>
      </div>

      {/* ── Score Section ── */}
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-color)" }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-body font-semibold uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>Score</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-body font-medium px-2 py-0.5 rounded-full" style={{ background: `${scoreColor}18`, color: scoreColor }}>
              {scoreLabel}
            </span>
            <span className="text-base font-heading font-bold" style={{ color: scoreColor }}>{creative.score}</span>
          </div>
        </div>
        {/* Score progress bar */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-bg)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${creative.score}%`,
              background: scoreColor,
            }}
          />
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="px-4 py-3 grid grid-cols-2 gap-2">
        {/* ROAS — highlighted */}
        <div className="col-span-2 flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}>
          <div className="flex items-center gap-1.5">
            <TrendingUp size={13} style={{ color: "#10b981" }} />
            <span className="text-xs font-body font-semibold uppercase tracking-wide" style={{ color: "#10b981" }}>ROAS</span>
          </div>
          <span className="text-sm font-heading font-bold" style={{ color: "#10b981" }}>↗ {creative.metrics.roas}</span>
        </div>
        {/* CTR */}
        <div className="px-3 py-2 rounded-lg" style={{ background: "var(--surface-bg)" }}>
          <p className="text-[10px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--text-dimmer)" }}>CTR</p>
          <p className="text-sm font-heading font-bold" style={{ color: "var(--text-main)" }}>{creative.metrics.ctr}</p>
        </div>
        {/* CPL */}
        <div className="px-3 py-2 rounded-lg" style={{ background: "var(--surface-bg)" }}>
          <p className="text-[10px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--text-dimmer)" }}>CPL</p>
          <p className="text-sm font-heading font-bold" style={{ color: "var(--text-main)" }}>{creative.metrics.cpl}</p>
        </div>
        {/* CPM */}
        <div className="px-3 py-2 rounded-lg" style={{ background: "var(--surface-bg)" }}>
          <p className="text-[10px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--text-dimmer)" }}>CPM</p>
          <p className="text-sm font-heading font-bold" style={{ color: "var(--text-main)" }}>{creative.metrics.cpm}</p>
        </div>
        {/* Impressões */}
        <div className="px-3 py-2 rounded-lg" style={{ background: "var(--surface-bg)" }}>
          <p className="text-[10px] font-body font-semibold uppercase tracking-wide mb-0.5" style={{ color: "var(--text-dimmer)" }}>Impressões</p>
          <p className="text-sm font-heading font-bold" style={{ color: "var(--text-main)" }}>{creative.metrics.impressoes}</p>
        </div>
        {/* Investido */}
        <div className="col-span-2 flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(245,166,35,0.07)", border: "1px solid rgba(245,166,35,0.18)" }}>
          <span className="text-xs font-body font-semibold uppercase tracking-wide" style={{ color: "#f5a623" }}>Investido</span>
          <span className="text-sm font-heading font-bold" style={{ color: "#f5a623" }}>{creative.metrics.investido}</span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="px-4 pb-4 flex items-center gap-2">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-body font-semibold transition-all"
          style={{ background: "rgba(124,58,237,0.12)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.25)" }}
        >
          <Eye size={13} />
          Ver Detalhes
        </button>
        <button
          onClick={onCompare}
          disabled={!onCompare}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-body font-semibold transition-all disabled:opacity-40"
          style={{ background: "var(--surface-bg)", color: "var(--text-dim)", border: "1px solid var(--border-color)" }}
        >
          <BarChart2 size={13} />
          Comparar
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export type CreativesLiveProps = {
  creatives: UxCreativeCard[];
  filterTabs: string[];
  loading?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  activeFilterTab?: string;
  onOpenCriteria?: () => void;
  headerActions?: ReactNode;
  onPreview?: (creative: UxCreativeCard) => void;
  onCompare?: (creative: UxCreativeCard) => void;
  hideChrome?: boolean;
};

export default function CreativesContent({ live }: { live?: CreativesLiveProps } = {}) {
  const isLive = Boolean(live);
  const [selectedClient, setSelectedClient] = useState("Gabi Dawson");
  const [selectedPeriod, setSelectedPeriod] = useState("Últimos 30 dias");
  const [selectedAccount, setSelectedAccount] = useState("[ativo] CA 03 – Gabi Dawson – Paciente Final");
  const [activeFilterTab, setActiveFilterTab] = useState("Todos");
  const resolvedFilterTab = isLive && live!.activeFilterTab !== undefined ? live!.activeFilterTab : activeFilterTab;
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchQuery = isLive ? (live!.searchQuery ?? "") : localSearchQuery;
  const setSearchQuery = isLive ? (live!.onSearchChange ?? (() => {})) : setLocalSearchQuery;
  const sourceFilterTabs = isLive ? live!.filterTabs : filterTabs;
  const [clientOpen, setClientOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [previewCreative, setPreviewCreative] = useState<CreativeCard | null>(null);

  const openCriteria = () => {
    if (isLive && live?.onOpenCriteria) live.onOpenCriteria();
    else setShowCriteria(true);
  };

  const accounts = [
    "[ativo] CA 03 – Gabi Dawson – Paciente Final",
    "[ativo] CA 01 – Gabi Dawson – Cursos",
    "[ativo] CA 02 – Gabi Dawson – Remarketing",
  ];

  const closeAll = () => { setClientOpen(false); setPeriodOpen(false); setAccountOpen(false); };

  const sourceCreatives = isLive ? live!.creatives : creativesData;

  const filteredCreatives = sourceCreatives.filter((c) => {
    const matchesTab = resolvedFilterTab === "Todos" || c.campaignType === resolvedFilterTab;
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const filteredLiveCreatives = isLive ? (filteredCreatives as UxCreativeCard[]) : [];
  const filteredMockCreatives = !isLive ? (filteredCreatives as CreativeCard[]) : [];

  const liveEmbedded = isLive && live?.hideChrome;
  const pageShellClass = liveEmbedded
    ? "w-full"
    : "flex-1 overflow-y-auto px-4 py-6 sm:px-6";
  const PageTag = liveEmbedded ? "div" : "main";

  return (
    <PageTag
          className={pageShellClass}
          style={liveEmbedded ? undefined : { scrollbarWidth: "thin" }}
          onClick={() => closeAll()}
        >
          {/* ── Page Header (mock only) ── */}
          {!isLive || !live?.hideChrome ? (
          <>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-xs font-body mb-1" style={{ color: "var(--text-dim)" }}>Ranking de Criativos</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,166,35,0.15)" }}>
                  <Trophy size={16} style={{ color: "#f5a623" }} />
                </div>
                <h1 className="font-heading font-bold text-2xl" style={{ color: "var(--text-main)" }}>Ranking de Criativos</h1>
              </div>
              <p className="text-sm font-body mt-1" style={{ color: "var(--text-dim)" }}>
                Identifique os melhores e piores criativos de cada conta por tipo de campanha.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isLive ? (
                live?.headerActions
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); openCriteria(); }}
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-body font-semibold transition-all hover:brightness-110"
                  style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419" }}
                >
                  <SlidersHorizontal size={14} />
                  Critérios de ranqueamento
                </button>
              )}
            </div>
          </div>

          {/* ── Filter Row 1: Period / Client / Account (mock only) ── */}
          {!isLive ? (
          <div className="flex items-center gap-3 mb-4 flex-wrap" onClick={e => e.stopPropagation()}>
            {/* Period */}
            <div className="relative">
              <button
                onClick={() => { setPeriodOpen(!periodOpen); setClientOpen(false); setAccountOpen(false); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-body border"
                style={{ background: "var(--surface-card)", borderColor: "#f5a623", color: "var(--text-main)" }}
              >
                <span>{selectedPeriod}</span>
                <ChevronDown size={13} style={{ color: "#f5a623" }} />
              </button>
              {periodOpen && (
                <div className="absolute top-full mt-1 left-0 z-50 rounded-lg border shadow-xl min-w-[160px] overflow-hidden" style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}>
                  {periods.map(p => (
                    <button key={p} onClick={() => { setSelectedPeriod(p); setPeriodOpen(false); }} className="w-full text-left px-3 py-2 text-sm font-body whitespace-nowrap hover:bg-white/5" style={{ color: "var(--text-main)" }}>{p}</button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-sm font-body" style={{ color: "var(--text-dim)" }}>Cliente</span>

            {/* Client */}
            <div className="relative">
              <button
                onClick={() => { setClientOpen(!clientOpen); setPeriodOpen(false); setAccountOpen(false); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-body border"
                style={{ background: "var(--surface-card)", borderColor: "#f5a623", color: "var(--text-main)" }}
              >
                <span>{selectedClient}</span>
                <ChevronDown size={13} style={{ color: "#f5a623" }} />
              </button>
              {clientOpen && (
                <div className="absolute top-full mt-1 left-0 z-50 rounded-lg border shadow-xl min-w-full overflow-hidden" style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}>
                  {clients.map(c => (
                    <button key={c} onClick={() => { setSelectedClient(c); setClientOpen(false); }} className="w-full text-left px-3 py-2 text-sm font-body whitespace-nowrap hover:bg-white/5" style={{ color: "var(--text-main)" }}>{c}</button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-sm font-body" style={{ color: "var(--text-dim)" }}>Conta</span>

            {/* Account */}
            <div className="relative flex-1 min-w-0">
              <button
                onClick={() => { setAccountOpen(!accountOpen); setClientOpen(false); setPeriodOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm font-body border"
                style={{ background: "var(--surface-card)", borderColor: "#f5a623", color: "var(--text-main)" }}
              >
                <span className="truncate">{selectedAccount}</span>
                <ChevronDown size={13} className="flex-shrink-0" style={{ color: "#f5a623" }} />
              </button>
              {accountOpen && (
                <div className="absolute top-full mt-1 left-0 z-50 rounded-lg border shadow-xl w-full overflow-hidden" style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}>
                  {accounts.map(a => (
                    <button key={a} onClick={() => { setSelectedAccount(a); setAccountOpen(false); }} className="w-full text-left px-3 py-2.5 text-sm font-body whitespace-nowrap hover:bg-white/5" style={{ color: "var(--text-main)" }}>{a}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          ) : null}

          {/* ── Filter Row: type dropdown + search (mock only) ── */}
          {!isLive ? (
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap" onClick={e => e.stopPropagation()}>
            <FilterSelectDropdown
              icon={<Filter size={14} style={{ color: "#f5a623" }} />}
              label=""
              placeholder="Tipo de campanha"
              options={sourceFilterTabs.map((tab) => ({ value: tab, label: tab }))}
              value={resolvedFilterTab}
              onChange={setActiveFilterTab}
            />

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ background: "var(--surface-card)", borderColor: "#f5a623", minWidth: 220 }}>
              <Search size={14} style={{ color: "var(--text-dimmer)" }} />
              <input
                type="text"
                placeholder="Buscar criativo..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none text-sm font-body w-full"
                style={{ color: "var(--text-main)" }}
              />
            </div>
          </div>
          ) : null}
          </>
          ) : null}

          {/* ── Info Banner ── */}
          <DsInfoBanner className="mb-4 text-xs">
            Ranking calculado com base nos critérios configurados por tipo de campanha. Criativos com menos de{" "}
            <strong className="text-[var(--ui-accent)]">100 impressões</strong> no período não entram na classificação.
            Clique em{" "}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openCriteria();
              }}
              className="font-semibold text-[var(--ui-accent)] underline"
            >
              Critérios de ranqueamento
            </button>{" "}
            para personalizar as métricas.
          </DsInfoBanner>

          {/* ── Cards Grid ── */}
          {isLive && live?.loading ? (
            <CreativeRankingCardsSkeleton count={8} />
          ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLive
              ? filteredLiveCreatives.map((card) => {
                  const canCompare =
                    (card.raw.breakdown && card.raw.breakdown.length > 1) ||
                    (card.raw.breakdownAdsets && card.raw.breakdownAdsets.length > 1);
                  return (
                    <CreativeRankingCard
                      key={card.id}
                      rank={card.rank}
                      title={card.title}
                      type={card.type}
                      campaignType={card.campaignType}
                      campaignsUsed={card.campaignsUsed}
                      status={card.raw.status}
                      imageUrl={card.raw.imageUrl}
                      thumbnailUrl={card.raw.thumbnailUrl}
                      score={card.score}
                      metrics={card.raw.metrics}
                      primaryMetric={card.primaryMetric}
                      metricKeys={card.metricKeys}
                      onPreview={() => live?.onPreview?.(card)}
                      onCompare={
                        canCompare && live?.onCompare ? () => live.onCompare!(card) : undefined
                      }
                    />
                  );
                })
              : filteredMockCreatives.map((creative) => (
                  <CreativeCardItem
                    key={creative.id}
                    creative={creative}
                    onPreview={() => setPreviewCreative(creative)}
                  />
                ))}
          </div>
          )}

          {/* ── Footer ── */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] text-[var(--text-dimmer)]">
              Exibindo {(isLive ? filteredLiveCreatives : filteredMockCreatives).length} de {sourceCreatives.length} criativos
            </p>
            <p className="text-[11px] text-[var(--text-dimmer)]">
              ≡ Ordenado por: Score (maior — menor)
            </p>
          </div>
        </PageTag>
  );
}
