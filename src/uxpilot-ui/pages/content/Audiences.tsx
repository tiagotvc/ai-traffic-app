"use client";

import { useState } from "react";
import { Search, ChevronDown, Users, RefreshCw, Plus, Eye, Target, X, ArrowLeft, ArrowRight, Check, Globe, Instagram, Facebook, Info, Shield, Clock, Hash, MapPin, Layers, Zap, CalendarDays, Activity } from "lucide-react";

const clients = ["Gabi Dawson", "TechVision", "BrandForce", "NovaMarca"];
const adAccounts: Record<string, string[]> = {
  "Gabi Dawson": [
    "[ativo] CA 03 - Gabi Dawson - Paciente Final",
    "[ativo] CA 01 - Gabi Dawson - Awareness",
    "[pausado] CA 02 - Gabi Dawson - Retargeting",
  ],
  "TechVision": [
    "[ativo] CA 01 - TechVision - Leads",
    "[ativo] CA 02 - TechVision - Conversão",
  ],
  "BrandForce": ["[ativo] CA 01 - BrandForce - Principal"],
  "NovaMarca": ["[ativo] CA 01 - NovaMarca - Tráfego"],
};

type AudienceType = "Personalizado" | "Engajamento" | "Lookalike" | "Salvo";
type AudienceSubtype =
  | "IG_BUSINESS"
  | "ENGAGEMENT"
  | "LOOKALIKE"
  | "SAVED_AUDIENCE";

interface Audience {
  id: number;
  name: string;
  type: AudienceType;
  subtype: AudienceSubtype;
  account: string;
  country: string;
  size: string;
  tab: "saved" | "excluded" | "templates";
}

const audiences: Audience[] = [
  // Saved
  {
    id: 1,
    name: "[ENVOLVIMENTO] [IG] [SEGUIDORES]",
    type: "Personalizado",
    subtype: "IG_BUSINESS",
    account: "Gabi Dawson",
    country: "BR",
    size: "~65.800",
    tab: "saved",
  },
  {
    id: 2,
    name: "[FB] [ENVOLV] [CTA] - @Gabi Dawson - 180D",
    type: "Engajamento",
    subtype: "ENGAGEMENT",
    account: "Gabi Dawson",
    country: "BR",
    size: "~1.000",
    tab: "saved",
  },
  {
    id: 3,
    name: "[FB] [ENVOLV] [CTA] - @Gabi Dawson - 30D",
    type: "Engajamento",
    subtype: "ENGAGEMENT",
    account: "Gabi Dawson",
    country: "BR",
    size: "~1.000",
    tab: "saved",
  },
  {
    id: 4,
    name: "[FB] [ENVOLV] [CTA] - @Gabi Dawson - 60D",
    type: "Engajamento",
    subtype: "ENGAGEMENT",
    account: "Gabi Dawson",
    country: "BR",
    size: "~1.000",
    tab: "saved",
  },
  {
    id: 5,
    name: "[LOOK] Seguidores IG - 1% Brasil",
    type: "Lookalike",
    subtype: "LOOKALIKE",
    account: "Gabi Dawson",
    country: "BR",
    size: "~2.100.000",
    tab: "saved",
  },
  {
    id: 6,
    name: "[LOOK] Compradores - 2% Brasil",
    type: "Lookalike",
    subtype: "LOOKALIKE",
    account: "Gabi Dawson",
    country: "BR",
    size: "~4.200.000",
    tab: "saved",
  },
  // Excluded
  {
    id: 7,
    name: "[EXCL] Compradores últimos 30D",
    type: "Personalizado",
    subtype: "IG_BUSINESS",
    account: "Gabi Dawson",
    country: "BR",
    size: "~850",
    tab: "excluded",
  },
  {
    id: 8,
    name: "[EXCL] Leads já convertidos",
    type: "Engajamento",
    subtype: "ENGAGEMENT",
    account: "Gabi Dawson",
    country: "BR",
    size: "~2.300",
    tab: "excluded",
  },
  // Templates
  {
    id: 9,
    name: "[TEMPLATE] Engajamento IG 30D",
    type: "Personalizado",
    subtype: "IG_BUSINESS",
    account: "Gabi Dawson",
    country: "BR",
    size: "—",
    tab: "templates",
  },
  {
    id: 10,
    name: "[TEMPLATE] Lookalike 1% Compradores",
    type: "Lookalike",
    subtype: "LOOKALIKE",
    account: "Gabi Dawson",
    country: "BR",
    size: "—",
    tab: "templates",
  },
];

const typeBadgeStyle: Record<AudienceType, { bg: string; color: string }> = {
  Personalizado: { bg: "rgba(79,70,229,0.12)", color: "#818cf8" },
  Engajamento: { bg: "rgba(245,166,35,0.13)", color: "#f59e0b" },
  Lookalike: { bg: "rgba(16,185,129,0.12)", color: "#10b981" },
  Salvo: { bg: "rgba(124,58,237,0.12)", color: "#a78bfa" },
};

const subtypeBadgeStyle: Record<AudienceSubtype, { bg: string; color: string }> = {
  IG_BUSINESS: { bg: "rgba(236,72,153,0.1)", color: "#f472b6" },
  ENGAGEMENT: { bg: "rgba(245,166,35,0.08)", color: "#d97706" },
  LOOKALIKE: { bg: "rgba(16,185,129,0.1)", color: "#059669" },
  SAVED_AUDIENCE: { bg: "rgba(124,58,237,0.1)", color: "#7c3aed" },
};

type TabKey = "saved" | "excluded" | "templates";
const tabs: { key: TabKey; label: string }[] = [
  { key: "saved", label: "Públicos salvos" },
  { key: "excluded", label: "Excluídos" },
  { key: "templates", label: "Templates" },
];

// ─── Audience Detail Modal ────────────────────────────────────────────────────
const audienceDetails: Record<number, {
  metaId: string;
  deliveryStatus: string;
  deliveryStatusOk: boolean;
  operationalStatus: string;
  estimatedMin: string;
  estimatedMax: string;
  createdAt: string;
  updatedAt: string;
  rules: { label: string; source: string; action: string }[];
}> = {
  1: {
    metaId: "120240201044300149",
    deliveryStatus: "Esse público está pronto para uso.",
    deliveryStatusOk: true,
    operationalStatus: "Estamos encontrando pessoas que atendem aos seus critérios de público. Você pode começar a veicular anúncios com esse público imediatamente, mas esteja ciente de que o tamanho do seu público aumentará à medida que o público for preenchido.",
    estimatedMin: "55.800",
    estimatedMax: "65.700",
    createdAt: "21/01/1970, 08:34:17",
    updatedAt: "21/01/1970, 08:34:17",
    rules: [{ label: "Engajamento", source: "ig_business", action: "INSTAGRAM_PROFILE_FOLLOW" }],
  },
  2: {
    metaId: "120240201044300150",
    deliveryStatus: "Esse público está pronto para uso.",
    deliveryStatusOk: true,
    operationalStatus: "Público pronto. Você pode usá-lo em campanhas imediatamente.",
    estimatedMin: "800",
    estimatedMax: "1.200",
    createdAt: "15/03/2024, 14:22:00",
    updatedAt: "20/03/2024, 09:10:30",
    rules: [{ label: "Engajamento", source: "facebook_page", action: "PAGE_ENGAGED" }],
  },
  3: {
    metaId: "120240201044300151",
    deliveryStatus: "Esse público está pronto para uso.",
    deliveryStatusOk: true,
    operationalStatus: "Público pronto. Você pode usá-lo em campanhas imediatamente.",
    estimatedMin: "800",
    estimatedMax: "1.200",
    createdAt: "15/03/2024, 14:22:00",
    updatedAt: "20/03/2024, 09:10:30",
    rules: [{ label: "Engajamento", source: "facebook_page", action: "PAGE_ENGAGED_30D" }],
  },
  4: {
    metaId: "120240201044300152",
    deliveryStatus: "Esse público está pronto para uso.",
    deliveryStatusOk: true,
    operationalStatus: "Público pronto. Você pode usá-lo em campanhas imediatamente.",
    estimatedMin: "800",
    estimatedMax: "1.200",
    createdAt: "15/03/2024, 14:22:00",
    updatedAt: "20/03/2024, 09:10:30",
    rules: [{ label: "Engajamento", source: "facebook_page", action: "PAGE_ENGAGED_60D" }],
  },
  5: {
    metaId: "120240201044300153",
    deliveryStatus: "Esse público está pronto para uso.",
    deliveryStatusOk: true,
    operationalStatus: "Público Lookalike processado e pronto para veiculação.",
    estimatedMin: "2.000.000",
    estimatedMax: "2.200.000",
    createdAt: "01/02/2024, 10:00:00",
    updatedAt: "05/02/2024, 11:30:00",
    rules: [{ label: "Lookalike", source: "seguidores_ig", action: "LOOKALIKE_1_PERCENT" }],
  },
  6: {
    metaId: "120240201044300154",
    deliveryStatus: "Esse público está pronto para uso.",
    deliveryStatusOk: true,
    operationalStatus: "Público Lookalike processado e pronto para veiculação.",
    estimatedMin: "4.000.000",
    estimatedMax: "4.400.000",
    createdAt: "01/02/2024, 10:00:00",
    updatedAt: "05/02/2024, 11:30:00",
    rules: [{ label: "Lookalike", source: "compradores", action: "LOOKALIKE_2_PERCENT" }],
  },
  7: {
    metaId: "120240201044300155",
    deliveryStatus: "Público em uso como exclusão.",
    deliveryStatusOk: true,
    operationalStatus: "Público ativo e sendo utilizado como exclusão em campanhas ativas.",
    estimatedMin: "700",
    estimatedMax: "1.000",
    createdAt: "10/01/2024, 08:00:00",
    updatedAt: "12/01/2024, 09:00:00",
    rules: [{ label: "Compra", source: "pixel_site", action: "PURCHASE_30D" }],
  },
  8: {
    metaId: "120240201044300156",
    deliveryStatus: "Público em uso como exclusão.",
    deliveryStatusOk: true,
    operationalStatus: "Público ativo e sendo utilizado como exclusão em campanhas ativas.",
    estimatedMin: "2.000",
    estimatedMax: "2.600",
    createdAt: "10/01/2024, 08:00:00",
    updatedAt: "12/01/2024, 09:00:00",
    rules: [{ label: "Lead", source: "pixel_site", action: "LEAD_CONVERTED" }],
  },
  9: {
    metaId: "TEMPLATE",
    deliveryStatus: "Template — sem entrega.",
    deliveryStatusOk: false,
    operationalStatus: "Este é um template de público. Duplique-o para criar um público real.",
    estimatedMin: "—",
    estimatedMax: "—",
    createdAt: "01/01/2024, 00:00:00",
    updatedAt: "01/01/2024, 00:00:00",
    rules: [{ label: "Engajamento IG", source: "ig_business", action: "INSTAGRAM_PROFILE_ENGAGE" }],
  },
  10: {
    metaId: "TEMPLATE",
    deliveryStatus: "Template — sem entrega.",
    deliveryStatusOk: false,
    operationalStatus: "Este é um template de público Lookalike. Duplique-o para criar um público real.",
    estimatedMin: "—",
    estimatedMax: "—",
    createdAt: "01/01/2024, 00:00:00",
    updatedAt: "01/01/2024, 00:00:00",
    rules: [{ label: "Lookalike", source: "compradores", action: "LOOKALIKE_1_PERCENT" }],
  },
};

function AudienceDetailModal({ audience, onClose }: { audience: Audience; onClose: () => void }) {
  const detail = audienceDetails[audience.id];
  const typeStyle = typeBadgeStyle[audience.type];
  const subtypeStyle = subtypeBadgeStyle[audience.subtype];

  const metaGrid = [
    { icon: Hash, label: "ID na Meta", value: detail.metaId },
    { icon: Layers, label: "Subtipo", value: audience.subtype },
    { icon: Users, label: "Cliente", value: audience.account },
    { icon: MapPin, label: "País", value: audience.country },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-fade-up"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="relative px-6 pt-6 pb-5"
          style={{ borderBottom: "1px solid var(--border-color)" }}
        >
          {/* Amber accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: "linear-gradient(90deg, #f5a623, #f59e0b88)" }} />
          <div className="flex items-start justify-between gap-3 mt-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.25)" }}>
                <Users size={18} style={{ color: "#f5a623" }} />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading font-bold text-base leading-tight" style={{ color: "var(--text-main)" }}>
                  Detalhes do público
                </h2>
                <p className="text-xs font-body mt-0.5 truncate" style={{ color: "var(--text-dimmer)" }}>
                  {audience.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#f5a623")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
            >
              <X size={14} style={{ color: "var(--text-dim)" }} />
            </button>
          </div>

          {/* Type badges */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <span
              className="text-[11px] font-heading font-semibold px-3 py-1 rounded-full"
              style={{ background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.color}30` }}
            >
              {audience.type}
            </span>
            <span
              className="text-[11px] font-body font-medium px-3 py-1 rounded-full"
              style={{ background: subtypeStyle.bg, color: subtypeStyle.color, border: `1px solid ${subtypeStyle.color}30` }}
            >
              {audience.subtype}
            </span>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── Metadata Grid ── */}
          <div className="grid grid-cols-2 gap-3">
            {metaGrid.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl p-4"
                style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon size={13} style={{ color: "#f5a623" }} />
                  <span className="text-[11px] font-body uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>{label}</span>
                </div>
                <p className="text-sm font-heading font-semibold truncate" style={{ color: "var(--text-main)" }}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Conta de anúncios (full width) ── */}
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}
          >
            <Shield size={14} style={{ color: "#818cf8" }} />
            <div className="min-w-0">
              <span className="text-[11px] font-body uppercase tracking-wide block" style={{ color: "var(--text-dimmer)" }}>Conta de anúncios</span>
              <span className="text-sm font-heading font-semibold truncate block" style={{ color: "var(--text-main)" }}>
                act_{detail.metaId === "TEMPLATE" ? "—" : "1038651790684432"}
              </span>
            </div>
          </div>

          {/* ── Tamanho estimado ── */}
          <div
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.2)" }}
          >
            <div className="flex items-center gap-2">
              <Activity size={15} style={{ color: "#f5a623" }} />
              <span className="text-sm font-body font-medium" style={{ color: "var(--text-dim)" }}>Tamanho estimado</span>
            </div>
            <span className="text-base font-heading font-bold" style={{ color: "#f5a623" }}>
              {detail.estimatedMin === "—" ? "—" : `${detail.estimatedMin} – ${detail.estimatedMax}`}
            </span>
          </div>

          {/* ── Status cards row ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Delivery status */}
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--surface-bg)", border: `1px solid ${detail.deliveryStatusOk ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.2)"}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: detail.deliveryStatusOk ? "#10b981" : "#ef4444", boxShadow: `0 0 6px ${detail.deliveryStatusOk ? "#10b98180" : "#ef444480"}` }}
                />
                <span className="text-[11px] font-body uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>Status de entrega</span>
              </div>
              <p className="text-xs font-body font-semibold leading-snug" style={{ color: detail.deliveryStatusOk ? "#10b981" : "#ef4444" }}>
                {detail.deliveryStatus}
              </p>
            </div>

            {/* Operational status mini */}
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--surface-bg)", border: "1px solid rgba(245,166,35,0.2)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} style={{ color: "#f5a623" }} />
                <span className="text-[11px] font-body uppercase tracking-wide" style={{ color: "var(--text-dimmer)" }}>Status operacional</span>
              </div>
              <p className="text-xs font-body leading-snug line-clamp-3" style={{ color: "#f5a623" }}>
                {detail.operationalStatus}
              </p>
            </div>
          </div>

          {/* ── Timestamps ── */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: CalendarDays, label: "Criado em", value: detail.createdAt },
              { icon: Clock, label: "Atualizado em", value: detail.updatedAt },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                <Icon size={13} style={{ color: "var(--text-dimmer)" }} />
                <div>
                  <span className="text-[10px] font-body uppercase tracking-wide block" style={{ color: "var(--text-dimmer)" }}>{label}</span>
                  <span className="text-xs font-heading font-semibold" style={{ color: "var(--text-main)" }}>{value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Regras do público ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "rgba(79,70,229,0.15)" }}>
                <Layers size={11} style={{ color: "#818cf8" }} />
              </div>
              <span className="text-sm font-heading font-semibold" style={{ color: "var(--text-main)" }}>Regras do público</span>
            </div>
            <div className="space-y-2">
              {detail.rules.map((rule, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid rgba(79,70,229,0.2)" }}
                >
                  {/* Rule header */}
                  <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: "rgba(79,70,229,0.1)" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#818cf8" }} />
                    <span className="text-xs font-heading font-semibold" style={{ color: "#818cf8" }}>{rule.label}</span>
                  </div>
                  {/* Rule body */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-3" style={{ background: "var(--surface-bg)" }}>
                    <div>
                      <span className="text-[10px] font-body uppercase tracking-wide block mb-1" style={{ color: "var(--text-dimmer)" }}>Fonte</span>
                      <span
                        className="text-xs font-body font-semibold px-2 py-0.5 rounded-md inline-block"
                        style={{ background: "rgba(129,140,248,0.12)", color: "#818cf8" }}
                      >
                        {rule.source}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-body uppercase tracking-wide block mb-1" style={{ color: "var(--text-dimmer)" }}>Ação</span>
                      <span
                        className="text-xs font-body font-semibold px-2 py-0.5 rounded-md inline-block"
                        style={{ background: "rgba(245,166,35,0.1)", color: "#f5a623" }}
                      >
                        {rule.action}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: "1px solid var(--border-color)", background: "var(--surface-bg)" }}
        >
          <span className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>
            ID: {detail.metaId}
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-heading font-semibold transition-all hover:brightness-110"
            style={{ background: "#f5a623", color: "#0f1419" }}
          >
            <X size={13} />
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Stepper Modal ────────────────────────────────────────────────────────────
const STEPS = ["Tipo", "Configuração", "Público-alvo", "Revisão"];

type AudienceTypeChoice = "custom" | "lookalike" | "saved" | "";

function NewAudienceModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [typeChoice, setTypeChoice] = useState<AudienceTypeChoice>("");
  const [audienceName, setAudienceName] = useState("");
  const [source, setSource] = useState("instagram");
  const [window_, setWindow_] = useState("30");
  const [country, setCountry] = useState("BR");
  const [lookalikePct, setLookalikePct] = useState("1");

  const canNext =
    step === 0
      ? typeChoice !== ""
      : step === 1
      ? audienceName.trim() !== ""
      : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border-color)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div>
            <h2 className="font-heading font-bold text-lg" style={{ color: "var(--text-main)" }}>Criar novo público</h2>
            <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>Passo {step + 1} de {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10">
            <X size={16} style={{ color: "var(--text-dim)" }} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-0">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-heading transition-all"
                    style={{
                      background: i < step ? "#10b981" : i === step ? "#7c3aed" : "var(--surface-bg)",
                      color: i <= step ? "#fff" : "var(--text-dimmer)",
                      border: i > step ? "1px solid var(--border-color)" : "none",
                    }}
                  >
                    {i < step ? <Check size={13} /> : i + 1}
                  </div>
                  <span className="text-[10px] font-body mt-1 whitespace-nowrap" style={{ color: i === step ? "#7c3aed" : "var(--text-dimmer)" }}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-px mx-2 mt-[-14px]" style={{ background: i < step ? "#10b981" : "var(--border-color)" }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[220px]">
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm font-body font-medium mb-4" style={{ color: "var(--text-dim)" }}>Selecione o tipo de público que deseja criar:</p>
              {[
                { id: "custom" as AudienceTypeChoice, label: "Público Personalizado", desc: "Baseado em interações, visitas, compradores etc.", icon: Users, color: "#818cf8" },
                { id: "lookalike" as AudienceTypeChoice, label: "Público Lookalike", desc: "Pessoas semelhantes a um público existente.", icon: Target, color: "#10b981" },
                { id: "saved" as AudienceTypeChoice, label: "Público Salvo", desc: "Segmentação por interesses, dados demográficos.", icon: Globe, color: "#f59e0b" },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setTypeChoice(opt.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left"
                  style={{
                    borderColor: typeChoice === opt.id ? opt.color : "var(--border-color)",
                    background: typeChoice === opt.id ? `${opt.color}12` : "var(--surface-bg)",
                  }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${opt.color}18` }}>
                    <opt.icon size={17} style={{ color: opt.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-body font-semibold" style={{ color: "var(--text-main)" }}>{opt.label}</p>
                    <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>{opt.desc}</p>
                  </div>
                  {typeChoice === opt.id && <Check size={16} className="ml-auto flex-shrink-0" style={{ color: opt.color }} />}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-body font-medium mb-1.5" style={{ color: "var(--text-main)" }}>Nome do público</label>
                <input
                  type="text"
                  placeholder="Ex: [ENVOLV] [IG] Seguidores 30D"
                  value={audienceName}
                  onChange={e => setAudienceName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm font-body outline-none border transition-colors"
                  style={{ background: "var(--surface-bg)", borderColor: "var(--border-color)", color: "var(--text-main)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "#f5a623")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--border-color)")}
                />
              </div>
              {typeChoice === "custom" && (
                <>
                  <div>
                    <label className="block text-sm font-body font-medium mb-1.5" style={{ color: "var(--text-main)" }}>Fonte</label>
                    <div className="flex gap-2">
                      {[{ v: "instagram", label: "Instagram", Icon: Instagram }, { v: "facebook", label: "Facebook", Icon: Facebook }, { v: "site", label: "Site", Icon: Globe }].map(s => (
                        <button
                          key={s.v}
                          onClick={() => setSource(s.v)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body border flex-1 justify-center transition-all"
                          style={{
                            borderColor: source === s.v ? "#f5a623" : "var(--border-color)",
                            background: source === s.v ? "rgba(245,166,35,0.1)" : "var(--surface-bg)",
                            color: source === s.v ? "#f5a623" : "var(--text-dim)",
                          }}
                        >
                          <s.Icon size={13} /> {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-body font-medium mb-1.5" style={{ color: "var(--text-main)" }}>Janela de tempo</label>
                    <div className="flex gap-2">
                      {["7", "14", "30", "60", "90", "180"].map(d => (
                        <button
                          key={d}
                          onClick={() => setWindow_(d)}
                          className="flex-1 py-2 rounded-lg text-xs font-body border transition-all"
                          style={{
                            borderColor: window_ === d ? "#7c3aed" : "var(--border-color)",
                            background: window_ === d ? "rgba(124,58,237,0.12)" : "var(--surface-bg)",
                            color: window_ === d ? "#a78bfa" : "var(--text-dim)",
                          }}
                        >
                          {d}D
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              {typeChoice === "lookalike" && (
                <div>
                  <label className="block text-sm font-body font-medium mb-1.5" style={{ color: "var(--text-main)" }}>Porcentagem de similaridade</label>
                  <div className="flex gap-2">
                    {["1", "2", "3", "5"].map(p => (
                      <button
                        key={p}
                        onClick={() => setLookalikePct(p)}
                        className="flex-1 py-2 rounded-lg text-xs font-body border transition-all"
                        style={{
                          borderColor: lookalikePct === p ? "#10b981" : "var(--border-color)",
                          background: lookalikePct === p ? "rgba(16,185,129,0.1)" : "var(--surface-bg)",
                          color: lookalikePct === p ? "#10b981" : "var(--text-dim)",
                        }}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-body font-medium mb-1.5" style={{ color: "var(--text-main)" }}>País / Região</label>
                <div className="flex gap-2">
                  {["BR", "PT", "US", "ES"].map(c => (
                    <button
                      key={c}
                      onClick={() => setCountry(c)}
                      className="flex-1 py-2 rounded-lg text-sm font-body border font-semibold transition-all"
                      style={{
                        borderColor: country === c ? "#f5a623" : "var(--border-color)",
                        background: country === c ? "rgba(245,166,35,0.12)" : "var(--surface-bg)",
                        color: country === c ? "#f5a623" : "var(--text-dim)",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                <p className="text-xs font-body" style={{ color: "var(--text-dim)" }}>O público será criado na conta de anúncios selecionada e ficará disponível para uso em campanhas após processamento pela Meta (pode levar até 30 minutos).</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm font-body font-medium mb-3" style={{ color: "var(--text-dim)" }}>Revise as configurações antes de criar:</p>
              {[
                { label: "Tipo", value: typeChoice === "custom" ? "Personalizado" : typeChoice === "lookalike" ? "Lookalike" : "Salvo" },
                { label: "Nome", value: audienceName || "—" },
                ...(typeChoice === "custom" ? [{ label: "Fonte", value: source }, { label: "Janela", value: `${window_} dias` }] : []),
                ...(typeChoice === "lookalike" ? [{ label: "Similaridade", value: `${lookalikePct}%` }] : []),
                { label: "País", value: country },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2.5 px-4 rounded-lg" style={{ background: "var(--surface-bg)", border: "1px solid var(--border-color)" }}>
                  <span className="text-sm font-body" style={{ color: "var(--text-dim)" }}>{row.label}</span>
                  <span className="text-sm font-body font-semibold" style={{ color: "var(--text-main)" }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: "1px solid var(--border-color)" }}>
          <button
            onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium border transition-all"
            style={{ borderColor: "var(--border-color)", color: "var(--text-dim)", background: "transparent" }}
          >
            {step === 0 ? "Cancelar" : <><ArrowLeft size={14} /> Voltar</>}
          </button>
          <button
            disabled={!canNext}
            onClick={() => {
              if (step < STEPS.length - 1) setStep(s => s + 1);
              else onClose();
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-heading font-semibold transition-all"
            style={{
              background: canNext ? "#7c3aed" : "rgba(124,58,237,0.3)",
              color: canNext ? "#fff" : "rgba(255,255,255,0.4)",
              cursor: canNext ? "pointer" : "not-allowed",
            }}
          >
            {step === STEPS.length - 1 ? <><Check size={14} /> Criar público</> : <>Próximo <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AudiencesContent() {
  const [activeTab, setActiveTab] = useState<TabKey>("saved");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState("Gabi Dawson");
  const [selectedAccount, setSelectedAccount] = useState(
    "[ativo] CA 03 - Gabi Dawson - Paciente Final"
  );
  const [clientOpen, setClientOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [showNewAudienceModal, setShowNewAudienceModal] = useState(false);
  const [detailAudience, setDetailAudience] = useState<Audience | null>(null);

  const filtered = audiences.filter(
    (a) =>
      a.tab === activeTab &&
      a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main
          className="flex-1 overflow-y-auto px-6 py-6"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--scrollbar-color) transparent",
          }}
          onClick={() => { setClientOpen(false); setAccountOpen(false); }}
        >
          {/* ── Page Header ── */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-body mb-1" style={{ color: "var(--text-dim)" }}>Públicos</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(79,70,229,0.15)" }}>
                  <Users size={16} style={{ color: "#818cf8" }} />
                </div>
                <h1 className="font-heading font-bold text-2xl" style={{ color: "var(--text-main)" }}>Públicos / Lookalike</h1>
              </div>
              <p className="text-sm font-body mt-1" style={{ color: "var(--text-dim)" }}>
                Crie, gerencie e reutilize públicos sem sair do Orion Agency.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium transition-all border"
                style={{
                  background: "var(--surface-card)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-dim)",
                }}
              >
                <RefreshCw size={14} />
                Atualizar da Meta
              </button>
              <button
                onClick={() => setShowNewAudienceModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-heading font-semibold transition-all hover:brightness-110"
                style={{ background: "#7c3aed", color: "#ffffff" }}
              >
                <Plus size={14} />
                Criar novo público
              </button>
            </div>
          </div>

          {/* ── Filter Row: Client / Account ── */}
          <div className="flex items-center gap-3 mb-4 flex-wrap" onClick={e => e.stopPropagation()}>
            <span className="text-sm font-body" style={{ color: "var(--text-dim)" }}>Cliente</span>

            {/* Client */}
            <div className="relative">
              <button
                onClick={() => { setClientOpen(!clientOpen); setAccountOpen(false); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-body border"
                style={{ background: "var(--surface-card)", borderColor: "#f5a623", color: "var(--text-main)" }}
              >
                <span>{selectedClient}</span>
                <ChevronDown size={13} style={{ color: "#f5a623" }} />
              </button>
              {clientOpen && (
                <div className="absolute top-full mt-1 left-0 z-50 rounded-lg border shadow-xl min-w-full overflow-hidden" style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}>
                  {clients.map(c => (
                    <button
                      key={c}
                      onClick={() => { setSelectedClient(c); setSelectedAccount(adAccounts[c]?.[0] ?? ""); setClientOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm font-body whitespace-nowrap hover:bg-white/5"
                      style={{ color: "var(--text-main)" }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-sm font-body" style={{ color: "var(--text-dim)" }}>Conta</span>

            {/* Account */}
            <div className="relative flex-1 min-w-0">
              <button
                onClick={() => { setAccountOpen(!accountOpen); setClientOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm font-body border"
                style={{ background: "var(--surface-card)", borderColor: "#f5a623", color: "var(--text-main)" }}
              >
                <span className="truncate">{selectedAccount}</span>
                <ChevronDown size={13} className="flex-shrink-0" style={{ color: "#f5a623" }} />
              </button>
              {accountOpen && (
                <div className="absolute top-full mt-1 left-0 z-50 rounded-lg border shadow-xl w-full overflow-hidden" style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}>
                  {(adAccounts[selectedClient] ?? []).map(acc => (
                    <button
                      key={acc}
                      onClick={() => { setSelectedAccount(acc); setAccountOpen(false); }}
                      className="w-full text-left px-3 py-2.5 text-sm font-body whitespace-nowrap hover:bg-white/5"
                      style={{ color: "var(--text-main)" }}
                    >
                      {acc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Tabs Row + Search ── */}
          <div className="flex items-center justify-between gap-4 mb-5 flex-wrap" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1 flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="px-4 py-1.5 rounded-lg text-sm font-body font-medium transition-all"
                  style={{
                    background: activeTab === tab.key ? "#f5a623" : "var(--surface-card)",
                    color: activeTab === tab.key ? "#0f1419" : "var(--text-dim)",
                    border: activeTab === tab.key ? "1px solid #f5a623" : "1px solid var(--border-color)",
                    fontWeight: activeTab === tab.key ? 600 : 400,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ background: "var(--surface-card)", borderColor: "#f5a623", minWidth: 200 }}>
              <Search size={14} style={{ color: "var(--text-dimmer)" }} />
              <input
                type="text"
                placeholder="Buscar públicos..."
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
              Públicos sincronizados diretamente da Meta. Criativos com menos de{" "}
              <strong style={{ color: "#f5a623" }}>100 impressões</strong> no período não entram na classificação. Mantenha seus públicos organizados para facilitar o uso em novas campanhas.
            </span>
          </div>

          {/* Main Content Card */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: "var(--surface-card)",
              borderColor: "var(--border-color)",
            }}
          >
            {/* Audience List */}
            <div>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(79,70,229,0.1)" }}
                  >
                    <Users size={20} style={{ color: "#818cf8" }} />
                  </div>
                  <p
                    className="text-sm font-body"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Nenhum público encontrado
                  </p>
                </div>
              ) : (
                filtered.map((audience, i) => (
                  <AudienceRow key={audience.id} audience={audience} isLast={i === filtered.length - 1} onViewDetails={() => setDetailAudience(audience)} />
                ))
              )}
            </div>
          </div>
          <div className="h-6" />
        </main>
  );
}

function AudienceRow({
  audience,
  isLast,
  onViewDetails,
}: {
  audience: Audience;
  isLast: boolean;
  onViewDetails: () => void;
}) {
  const typeStyle = typeBadgeStyle[audience.type];
  const subtypeStyle = subtypeBadgeStyle[audience.subtype];

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 transition-colors group"
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--border-color)",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.background =
          "var(--row-hover)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.background = "transparent")
      }
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(79,70,229,0.1)" }}
      >
        <Users size={16} style={{ color: "#818cf8" }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-body font-semibold mb-1.5 truncate"
          style={{ color: "var(--text-main)" }}
        >
          {audience.name}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type badge */}
          <span
            className="text-[11px] font-body font-medium px-2 py-0.5 rounded-full"
            style={{ background: typeStyle.bg, color: typeStyle.color }}
          >
            {audience.type}
          </span>
          {/* Subtype badge */}
          <span
            className="text-[11px] font-body font-medium px-2 py-0.5 rounded-full"
            style={{
              background: subtypeStyle.bg,
              color: subtypeStyle.color,
              border: `1px solid ${subtypeStyle.color}22`,
            }}
          >
            {audience.subtype}
          </span>
          {/* Account */}
          <span
            className="text-xs font-body"
            style={{ color: "var(--text-dimmer)" }}
          >
            Conta — {audience.account}
          </span>
        </div>
      </div>

      {/* Size + Country */}
      <div className="text-right flex-shrink-0 hidden sm:block mr-4">
        <span
          className="text-[10px] font-body block"
          style={{ color: "var(--text-dimmer)" }}
        >
          {audience.country}
        </span>
        <span
          className="text-xs font-body font-semibold"
          style={{ color: "var(--text-dim)" }}
        >
          {audience.size}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onViewDetails}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body border transition-all"
          style={{
            color: "var(--text-dim)",
            borderColor: "var(--border-color)",
            background: "var(--surface-bg)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#f5a623";
            (e.currentTarget as HTMLElement).style.color = "#f5a623";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--border-color)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
          }}
        >
          <Eye size={12} />
          Ver detalhes
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body border transition-all"
          style={{
            color: "var(--text-dim)",
            borderColor: "var(--border-color)",
            background: "var(--surface-bg)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "#7c3aed";
            (e.currentTarget as HTMLElement).style.color = "#7c3aed";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--border-color)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
          }}
        >
          <Target size={12} />
          Incluir no targeting padrão
        </button>
      </div>
    </div>
  );
}
