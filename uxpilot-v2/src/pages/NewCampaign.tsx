import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import {
  ChevronDown,
  Check,
  Folder,
  LayoutGrid,
  FileText,
  ClipboardCheck,
  Sparkles,
  MapPin,
  Search,
  Bot,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */
type Stage = "campaign" | "adset" | "ad" | "review";

/* ── Static data ── */
const clientOptions = [
  "Selecione um cliente...",
  "Sorriso Perfeito Clínica",
  "TechVision Ltda",
  "BrandForce Corp",
  "NovaMarca SA",
];

const adAccountOptions = [
  "Selecione uma conta...",
  "Conta #12345 — Sorriso Perfeito",
  "Conta #67890 — TechVision",
];

const conversionLocationOptions = [
  "Formulários no site e instantâneos",
  "Somente formulários instantâneos",
  "Somente site",
  "Messenger",
  "Instagram",
];

const savedAudiences = [
  { id: 1, name: "Semelhante (1% to 2%) — Pacientes_Gabi_Dawson_01_06_Filtrado.csv", tag: "Lookalike", tagId: "120246034408640149" },
  { id: 2, name: "Semelhante (2% to 3%) — Pacientes_Gabi_Dawson_01_06_Filtrado.csv", tag: "Lookalike", tagId: "120246034408630149" },
  { id: 3, name: "Semelhante (1%) — Pacientes_Gabi_Dawson_01_06_Filtrado.csv", tag: "Lookalike", tagId: "120246034407948149" },
  { id: 4, name: "Pacientes_Gabi_Dawson_01_06_Filtrado.csv", tag: "Custom", tagId: "120346034308078140" },
];

const specialCategories = ["Crédito", "Emprego", "Moradia", "Temas sociais / política"];

/* ── Campaign score computation ── */
function computeScore(
  client: string,
  campaignName: string,
  budgetMode: "cbo" | "abo",
  dailyBudget: string,
  adSetName: string,
  convLocation: string,
) {
  let score = 0;
  if (client && client !== "Selecione um cliente...") score += 20;
  if (campaignName) score += 20;
  if (budgetMode) score += 10;
  if (dailyBudget) score += 10;
  if (adSetName) score += 20;
  if (convLocation) score += 20;
  return Math.min(score, 100);
}

/* ── Circular progress SVG ── */
function CircularProgress({ value }: { value: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--border-color)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="#f5a623"
          strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span className="absolute text-base font-bold font-heading" style={{ color: "var(--amber)" }}>{value}</span>
    </div>
  );
}

export default function NewCampaign() {
  const navigate = useNavigate();

  /* ── Stage nav ── */
  const [stage, setStage] = useState<Stage>("campaign");

  /* ── Campaign fields ── */
  const [client, setClient] = useState("Selecione um cliente...");
  const [clientOpen, setClientOpen] = useState(false);
  const [copyConfig, setCopyConfig] = useState<"nao" | "sim">("nao");
  const [campaignName, setCampaignName] = useState("Nova campanha de Leads");
  const [adAccount, setAdAccount] = useState("Selecione uma conta...");
  const [adAccountOpen, setAdAccountOpen] = useState(false);
  const [budgetMode, setBudgetMode] = useState<"cbo" | "abo">("cbo");
  const [dailyBudget, setDailyBudget] = useState("150");
  const [specialCats, setSpecialCats] = useState<string[]>([]);
  const [abTest, setAbTest] = useState(false);

  /* ── Ad set fields ── */
  const [batchCount, setBatchCount] = useState(0);
  const [adSetName, setAdSetName] = useState("Novo conjunto de anúncios de Leads");
  const [convLocation, setConvLocation] = useState("Formulários no site e instantâneos");
  const [convLocationOpen, setConvLocationOpen] = useState(false);
  const [audienceSearch, setAudienceSearch] = useState("");
  const [includedAudiences, setIncludedAudiences] = useState<number[]>([]);
  const [audienceTab, setAudienceTab] = useState<"include" | "exclude">("include");
  const [locationSearch, setLocationSearch] = useState("");

  const score = computeScore(client, campaignName, budgetMode, dailyBudget, adSetName, convLocation);

  const toggleSpecialCat = (c: string) =>
    setSpecialCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const toggleAudience = (id: number) =>
    setIncludedAudiences((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const filteredAudiences = savedAudiences.filter((a) =>
    a.name.toLowerCase().includes(audienceSearch.toLowerCase())
  );

  const stages: { id: Stage; label: string; sublabel?: string; icon: React.ReactNode; done: boolean }[] = [
    {
      id: "campaign",
      label: "Nova campanha de L...",
      icon: <Folder size={14} />,
      done: false,
    },
    {
      id: "adset",
      label: "Novo conjunto de anún...",
      sublabel: "CONJUNTO DE ANÚNCIOS",
      icon: <LayoutGrid size={14} />,
      done: false,
    },
    {
      id: "ad",
      label: "Novo anúncio de Leads",
      sublabel: "ANÚNCIO",
      icon: <FileText size={14} />,
      done: false,
    },
    {
      id: "review",
      label: "Revisão",
      icon: <ClipboardCheck size={14} />,
      done: false,
    },
  ];

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--surface-bg)" }}
    >
      <Sidebar />

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Top breadcrumb + header ── */}
        <div
          className="sticky top-0 z-20 w-full border-b px-6 py-3 flex items-center gap-3"
          style={{
            background: "var(--surface-card)",
            borderColor: "var(--border-color)",
            boxShadow: "0 1px 0 var(--border-color)",
          }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>
              <button
                onClick={() => navigate("/campaigns")}
                className="hover:underline"
                style={{ color: "var(--text-dimmer)" }}
              >
                Campanhas
              </button>
              {" › "}
              <span style={{ color: "var(--text-dim)" }}>{campaignName}</span>
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>
                Criador de campanhas
              </h1>
              <span
                className="px-2 py-0.5 rounded text-xs font-heading font-semibold"
                style={{ background: "rgba(245,166,35,0.15)", color: "var(--amber)", border: "1px solid rgba(245,166,35,0.3)" }}
              >
                Rascunho
              </span>
              <span className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>
                Salvo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-4 py-1.5 rounded-lg text-sm font-heading font-semibold border transition-all hover:opacity-80"
              style={{
                borderColor: "var(--border-hover)",
                color: "var(--text-main)",
                background: "var(--surface-card)",
              }}
            >
              Editar
            </button>
            <button
              className="px-4 py-1.5 rounded-lg text-sm font-heading font-semibold border transition-all hover:opacity-80"
              style={{
                borderColor: "var(--border-hover)",
                color: "var(--text-main)",
                background: "var(--surface-card)",
              }}
            >
              Analisar
            </button>
          </div>
        </div>

        {/* ── Three-column layout ── */}
        <div className="flex-1 flex overflow-hidden" style={{ background: "var(--surface-bg)" }}>

          {/* ── LEFT: Stage navigator ── */}
          <div
            className="w-56 flex-shrink-0 border-r overflow-y-auto py-6 px-4"
            style={{
              background: "var(--surface-card)",
              borderColor: "var(--border-color)",
            }}
          >
            {/* Stepper title */}
            <p className="text-[10px] font-heading font-bold tracking-widest mb-5 px-1" style={{ color: "var(--text-dimmer)" }}>
              ETAPAS
            </p>

            {/* Vertical stepper */}
            <div className="relative flex flex-col gap-0">
              {/* Connecting line */}
              <div
                className="absolute left-[18px] top-8 bottom-8 w-px"
                style={{ background: "var(--border-color)" }}
              />

              {/* Step 1 — Campanha */}
              <StepItem
                active={stage === "campaign"}
                completed={["adset","ad","review"].includes(stage)}
                onClick={() => setStage("campaign")}
                icon={<Folder size={12} />}
                stepNum={1}
                label="Campanha"
                sublabel={campaignName.length > 20 ? campaignName.slice(0, 20) + "…" : campaignName}
              />

              {/* Step 2 — Conjunto */}
              <StepItem
                active={stage === "adset"}
                completed={["ad","review"].includes(stage)}
                onClick={() => setStage("adset")}
                icon={<LayoutGrid size={12} />}
                stepNum={2}
                label="Conjunto de anúncios"
                sublabel="Público e orçamento"
              />

              {/* Step 3 — Anúncio */}
              <StepItem
                active={stage === "ad"}
                completed={stage === "review"}
                onClick={() => setStage("ad")}
                icon={<FileText size={12} />}
                stepNum={3}
                label="Anúncio"
                sublabel="Criativo e textos"
              />

              {/* Step 4 — Revisão */}
              <StepItem
                active={stage === "review"}
                completed={false}
                onClick={() => setStage("review")}
                icon={<ClipboardCheck size={12} />}
                stepNum={4}
                label="Revisão"
                sublabel="Verificar e publicar"
                isLast
              />
            </div>
          </div>

          {/* ── CENTER: Form content ── */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", background: "var(--surface-bg)" }}>
            <div className="max-w-2xl mx-auto px-8 py-7 space-y-5">

              {/* ════ STAGE: Campaign ════ */}
              {stage === "campaign" && (
                <div className="space-y-5 animate-fade-up">

                  {/* Client selector */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>
                      Cliente
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setClientOpen(!clientOpen)}
                        className="w-full px-4 py-3 rounded-xl border text-sm font-body text-left flex items-center justify-between transition-all"
                        style={{
                          background: "var(--surface-card)",
                          borderColor: clientOpen ? "#f5a623" : "var(--border-color)",
                          color: client === "Selecione um cliente..." ? "var(--text-dimmer)" : "var(--text-main)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                      >
                        {client}
                        <ChevronDown size={16} className={cn("transition-transform", clientOpen && "rotate-180")} style={{ color: "var(--text-dim)" }} />
                      </button>
                      {clientOpen && (
                        <div
                          className="absolute top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden z-50 shadow-xl"
                          style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}
                        >
                          {clientOptions.map((c) => (
                            <button
                              key={c}
                              onClick={() => { setClient(c); setClientOpen(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm font-body flex items-center gap-2 transition-colors"
                              style={{ color: c === client ? "var(--amber)" : "var(--text-dim)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                            >
                              {c === client && <Check size={12} style={{ color: "var(--amber)" }} />}
                              {c !== client && <span className="w-3" />}
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Copy config card */}
                  <FormCard>
                    <div>
                      <p className="font-body font-semibold text-sm" style={{ color: "var(--text-main)" }}>
                        Copiar configuração de campanha?
                      </p>
                      <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>
                        Importe orçamento, público e textos de uma campanha existente.
                      </p>
                    </div>
                    <div className="flex items-center gap-6 mt-3">
                      {(["nao", "sim"] as const).map((val) => (
                        <label key={val} className="flex items-center gap-2 cursor-pointer">
                          <div
                            onClick={() => setCopyConfig(val)}
                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
                            style={{
                              borderColor: copyConfig === val ? "#f5a623" : "var(--border-hover)",
                              background: copyConfig === val ? "#f5a623" : "transparent",
                            }}
                          >
                            {copyConfig === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm font-body" style={{ color: "var(--text-main)" }}>
                            {val === "nao" ? "Não" : "Sim"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </FormCard>

                  {/* Campaign name */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>
                      Nome da campanha
                    </label>
                    <input
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-sm font-body outline-none transition-all"
                      style={{
                        background: "var(--surface-card)",
                        borderColor: "var(--border-color)",
                        color: "var(--text-main)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#f5a623")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                    />
                  </div>

                  {/* Ad account + Objective row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>
                        Conta de anúncios
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setAdAccountOpen(!adAccountOpen)}
                          className="w-full px-4 py-3 rounded-xl border text-sm font-body text-left flex items-center justify-between transition-all"
                          style={{
                            background: "var(--surface-card)",
                            borderColor: adAccountOpen ? "#f5a623" : "var(--border-color)",
                            color: adAccount === "Selecione uma conta..." ? "var(--text-dimmer)" : "var(--text-main)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                          }}
                        >
                          <span className="truncate">{adAccount}</span>
                          <ChevronDown size={14} className={cn("transition-transform flex-shrink-0", adAccountOpen && "rotate-180")} style={{ color: "var(--text-dim)" }} />
                        </button>
                        {adAccountOpen && (
                          <div
                            className="absolute top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden z-50 shadow-xl"
                            style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}
                          >
                            {adAccountOptions.map((c) => (
                              <button
                                key={c}
                                onClick={() => { setAdAccount(c); setAdAccountOpen(false); }}
                                className="w-full text-left px-4 py-2.5 text-sm font-body transition-colors"
                                style={{ color: "var(--text-dim)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                              >
                                {c}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>
                        Objetivo
                      </label>
                      <input
                        value="Leads"
                        readOnly
                        className="w-full px-4 py-3 rounded-xl border text-sm font-body outline-none"
                        style={{
                          background: "var(--surface-card)",
                          borderColor: "var(--border-color)",
                          color: "var(--text-main)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                      />
                    </div>
                  </div>

                  {/* Budget card */}
                  <FormCard>
                    <p className="font-body font-semibold text-sm mb-3" style={{ color: "var(--text-main)" }}>
                      Orçamento
                    </p>

                    {/* CBO option */}
                    <BudgetOption
                      selected={budgetMode === "cbo"}
                      onClick={() => setBudgetMode("cbo")}
                      title="Orçamento da campanha (CBO)"
                      subtitle="A Meta distribui o orçamento entre os conjuntos."
                    />
                    <div className="my-2" />
                    {/* ABO option */}
                    <BudgetOption
                      selected={budgetMode === "abo"}
                      onClick={() => setBudgetMode("abo")}
                      title="Orçamento do conjunto de anúncios (ABO)"
                      subtitle="Orçamento definido neste conjunto."
                    />

                    {/* Daily budget input */}
                    <div className="mt-4 space-y-1.5">
                      <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>
                        Orçamento diário (R$)
                      </label>
                      <input
                        type="number"
                        value={dailyBudget}
                        onChange={(e) => setDailyBudget(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border text-sm font-body outline-none transition-all"
                        style={{
                          background: "var(--surface-card)",
                          borderColor: "var(--border-color)",
                          color: "var(--text-main)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#f5a623")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                      />
                    </div>
                  </FormCard>

                  {/* Special Ad Categories */}
                  <FormCard>
                    <p className="font-body font-semibold text-sm" style={{ color: "var(--text-main)" }}>
                      Categorias de anúncio especiais
                    </p>
                    <p className="text-xs font-body mt-0.5 mb-3" style={{ color: "var(--text-dim)" }}>
                      Declare se o anúncio trata de crédito, emprego, moradia ou temas sociais/políticos.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {specialCategories.map((cat) => (
                        <label key={cat} className="flex items-center gap-2 cursor-pointer">
                          <div
                            onClick={() => toggleSpecialCat(cat)}
                            className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer"
                            style={{
                              borderColor: specialCats.includes(cat) ? "#f5a623" : "var(--border-hover)",
                              background: specialCats.includes(cat) ? "#f5a623" : "transparent",
                            }}
                          >
                            {specialCats.includes(cat) && <Check size={10} color="#0f1419" strokeWidth={3} />}
                          </div>
                          <span className="text-sm font-body" style={{ color: "var(--text-main)" }}>{cat}</span>
                        </label>
                      ))}
                    </div>
                  </FormCard>

                  {/* Teste A/B */}
                  <FormCard>
                    <div className="flex items-center justify-between">
                      <p className="font-body font-semibold text-sm" style={{ color: "var(--text-main)" }}>
                        Teste A/B
                      </p>
                      <div
                        onClick={() => setAbTest(!abTest)}
                        className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer"
                        style={{
                          borderColor: abTest ? "#f5a623" : "var(--border-hover)",
                          background: abTest ? "#f5a623" : "transparent",
                        }}
                      >
                        {abTest && <Check size={10} color="#0f1419" strokeWidth={3} />}
                      </div>
                    </div>
                  </FormCard>

                  {/* Nav button */}
                  <div className="flex justify-center pt-3">
                    <button
                      onClick={() => setStage("adset")}
                      className="px-8 py-3 rounded-xl text-sm font-heading font-bold transition-all hover:brightness-110 active:scale-95 shadow-lg"
                      style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419", boxShadow: "0 4px 16px rgba(245,166,35,0.35)" }}
                    >
                      Próximo: Conjunto de anúncios →
                    </button>
                  </div>
                </div>
              )}

              {/* ════ STAGE: Ad Set ════ */}
              {stage === "adset" && (
                <div className="space-y-5 animate-fade-up">

                  {/* Batch sets */}
                  <FormCard>
                    <p className="font-body font-semibold text-sm" style={{ color: "var(--text-main)" }}>
                      Conjuntos em lote
                    </p>
                    <p className="text-xs font-body mt-0.5 mb-4" style={{ color: "var(--text-dim)" }}>
                      Crie variações de conjunto com públicos distintos.
                    </p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-body" style={{ color: "var(--text-dim)" }}>
                        {batchCount} conjunto(s) extra(s)
                      </span>
                      <span className="text-sm font-body font-semibold" style={{ color: "var(--amber)" }}>
                        {batchCount === 0 ? "Apenas um conjunto" : `${batchCount + 1} conjuntos`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={batchCount}
                      onChange={(e) => setBatchCount(Number(e.target.value))}
                      className="w-full accent-violet-600"
                      style={{ accentColor: "#7c3aed" }}
                    />
                    <div className="flex justify-between text-[10px] font-body mt-1" style={{ color: "var(--text-dimmer)" }}>
                      {[0,1,2,3,4,5,6,7,8,9,10].map((n) => (
                        <span key={n}>{n}</span>
                      ))}
                    </div>
                  </FormCard>

                  {/* Ad set name */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>
                      Nome do conjunto de anúncios
                    </label>
                    <input
                      value={adSetName}
                      onChange={(e) => setAdSetName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border text-sm font-body outline-none transition-all"
                      style={{
                        background: "var(--surface-card)",
                        borderColor: "var(--border-color)",
                        color: "var(--text-main)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "#f5a623")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                    />
                  </div>

                  {/* Conversion location */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>
                      Local da conversão
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setConvLocationOpen(!convLocationOpen)}
                        className="w-full px-4 py-3 rounded-xl border text-sm font-body text-left flex items-center justify-between transition-all"
                        style={{
                          background: "var(--surface-card)",
                          borderColor: convLocationOpen ? "#f5a623" : "var(--border-color)",
                          color: "var(--text-main)",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                      >
                        {convLocation}
                        <ChevronDown size={16} className={cn("transition-transform flex-shrink-0", convLocationOpen && "rotate-180")} style={{ color: "var(--text-dim)" }} />
                      </button>
                      {convLocationOpen && (
                        <div
                          className="absolute top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden z-50 shadow-xl"
                          style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}
                        >
                          {conversionLocationOptions.map((o) => (
                            <button
                              key={o}
                              onClick={() => { setConvLocation(o); setConvLocationOpen(false); }}
                              className="w-full text-left px-4 py-2.5 text-sm font-body flex items-center gap-2 transition-colors"
                              style={{ color: o === convLocation ? "var(--amber)" : "var(--text-dim)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                            >
                              {o === convLocation && <Check size={12} style={{ color: "var(--amber)" }} />}
                              {o !== convLocation && <span className="w-3" />}
                              {o}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audience section */}
                  <FormCard>
                    <p className="font-body font-semibold text-base mb-4" style={{ color: "var(--text-main)" }}>
                      Público
                    </p>

                    {/* AI audience creation */}
                    <div
                      className="rounded-xl border p-4 mb-4 flex items-start justify-between gap-3"
                      style={{ background: "var(--surface-bg)", borderColor: "var(--border-color)" }}
                    >
                      <div className="flex items-start gap-3">
                        <Bot size={18} style={{ color: "var(--amber)" }} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-body font-semibold text-sm" style={{ color: "var(--text-main)" }}>
                            Criar público com IA
                          </p>
                          <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>
                            Descreva o perfil ideal; a IA monta uma prévia da persona e, após sua revisão, busca interesses na Meta.
                          </p>
                        </div>
                      </div>
                      <button
                        className="text-sm font-body font-semibold flex-shrink-0 flex items-center gap-1"
                        style={{ color: "var(--amber)" }}
                      >
                        Abrir assistente
                        <ExternalLink size={12} />
                      </button>
                    </div>

                    {/* Saved audiences */}
                    <p className="font-body font-semibold text-sm mb-1" style={{ color: "var(--text-main)" }}>
                      Públicos salvos da conta
                    </p>
                    <p className="text-xs font-body mb-3" style={{ color: "var(--text-dim)" }}>
                      Selecione públicos personalizados, lookalikes ou listas já criadas na Meta.
                    </p>

                    {/* Include/Exclude tabs */}
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setAudienceTab("include")}
                        className="px-4 py-1.5 rounded-lg text-sm font-body font-semibold transition-all"
                        style={{
                          background: audienceTab === "include" ? "rgba(245,166,35,0.1)" : "var(--surface-bg)",
                          color: audienceTab === "include" ? "var(--amber)" : "var(--text-dim)",
                          border: `1px solid ${audienceTab === "include" ? "rgba(245,166,35,0.3)" : "var(--border-color)"}`,
                        }}
                      >
                        Públicos a incluir ({includedAudiences.length})
                      </button>
                      <button
                        onClick={() => setAudienceTab("exclude")}
                        className="px-4 py-1.5 rounded-lg text-sm font-body font-semibold transition-all"
                        style={{
                          background: audienceTab === "exclude" ? "rgba(245,166,35,0.1)" : "var(--surface-bg)",
                          color: audienceTab === "exclude" ? "var(--amber)" : "var(--text-dim)",
                          border: `1px solid ${audienceTab === "exclude" ? "rgba(245,166,35,0.3)" : "var(--border-color)"}`,
                        }}
                      >
                        Públicos a excluir (0)
                      </button>
                    </div>

                    {/* Search */}
                    <div className="relative mb-2">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dimmer)" }} />
                      <input
                        value={audienceSearch}
                        onChange={(e) => setAudienceSearch(e.target.value)}
                        placeholder="Buscar público..."
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm font-body outline-none transition-all"
                        style={{
                          background: "var(--surface-bg)",
                          borderColor: "var(--border-color)",
                          color: "var(--text-main)",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = "#f5a623")}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                      />
                    </div>

                    {/* Audience list */}
                    <div
                      className="rounded-lg border overflow-hidden"
                      style={{ borderColor: "var(--border-color)", maxHeight: 200, overflowY: "auto" }}
                    >
                      {filteredAudiences.map((aud) => (
                        <label
                          key={aud.id}
                          className="flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors border-b last:border-b-0"
                          style={{ borderColor: "var(--border-color)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                        >
                          <div
                            onClick={() => toggleAudience(aud.id)}
                            className="w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer mt-0.5 flex-shrink-0"
                            style={{
                              borderColor: includedAudiences.includes(aud.id) ? "#f5a623" : "var(--border-hover)",
                              background: includedAudiences.includes(aud.id) ? "#f5a623" : "transparent",
                            }}
                          >
                            {includedAudiences.includes(aud.id) && <Check size={9} color="#0f1419" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-body" style={{ color: "var(--text-main)" }}>
                                {aud.name}
                              </span>
                              <span
                                className="text-[10px] font-heading font-semibold px-1.5 py-0.5 rounded"
                                style={{
                                  background: aud.tag === "Lookalike" ? "rgba(245,166,35,0.1)" : "rgba(16,185,129,0.1)",
                                  color: aud.tag === "Lookalike" ? "var(--amber)" : "#10b981",
                                }}
                              >
                                {aud.tag}
                              </span>
                            </div>
                            <p className="text-[10px] font-body mt-0.5" style={{ color: "var(--text-dimmer)" }}>
                              {aud.tagId}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </FormCard>

                  {/* Location section */}
                  <FormCard>
                    <p
                      className="text-[10px] font-heading font-semibold tracking-widest mb-3"
                      style={{ color: "var(--text-dimmer)" }}
                    >
                      OU DEFINA PÚBLICO POR LOCALIZAÇÃO E INTERESSES
                    </p>

                    <div className="space-y-1.5 mb-4">
                      <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>
                        Localizações
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-body"
                          style={{ background: "rgba(245,166,35,0.1)", color: "var(--amber)", border: "1px solid rgba(245,166,35,0.3)" }}
                        >
                          Brasil ×
                        </span>
                      </div>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-dimmer)" }} />
                        <input
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          placeholder="Buscar país, estado ou cidade..."
                          className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm font-body outline-none transition-all"
                          style={{
                            background: "var(--surface-bg)",
                            borderColor: "var(--border-color)",
                            color: "var(--text-main)",
                          }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#f5a623")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                        />
                      </div>
                    </div>

                    {/* Map placeholder */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>
                        Locais no mapa
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className="rounded-lg border p-3 flex items-center justify-between"
                          style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
                        >
                          <span className="text-sm font-body" style={{ color: "var(--text-main)" }}>Brasil</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-body" style={{ color: "var(--text-dim)" }}>10 km</span>
                            <div className="w-16 h-2 rounded-full relative" style={{ background: "var(--border-color)" }}>
                              <div className="absolute left-0 top-0 h-full w-1/2 rounded-full" style={{ background: "#f5a623" }} />
                            </div>
                            <span className="text-xs" style={{ color: "var(--text-dimmer)" }}>×</span>
                          </div>
                        </div>
                        <div
                          className="rounded-lg border p-3 space-y-2"
                          style={{ borderColor: "var(--border-color)", background: "var(--surface-bg)" }}
                        >
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body"
                            style={{ background: "rgba(245,166,35,0.1)", color: "var(--amber)", border: "1px solid rgba(245,166,35,0.3)" }}
                          >
                            Brasil ×
                          </span>
                          <input
                            placeholder="Buscar cidade ou endereço..."
                            className="w-full px-2 py-1.5 rounded border text-xs font-body outline-none"
                            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)", color: "var(--text-main)" }}
                          />
                        </div>
                      </div>

                      {/* Map visual */}
                      <div
                        className="rounded-xl border overflow-hidden mt-2 relative"
                        style={{ borderColor: "var(--border-color)", height: 180 }}
                      >
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #e8f4f8 0%, #d4e8f0 50%, #c8dcea 100%)" }}
                        >
                          {/* Stylized map elements */}
                          <div className="absolute inset-0 opacity-30">
                            <svg width="100%" height="100%" viewBox="0 0 400 180">
                              <path d="M50,90 Q100,50 150,80 Q200,110 250,70 Q300,30 350,60 Q380,80 400,75" fill="none" stroke="#f5a623" strokeWidth="1.5" opacity="0.5" />
                              <path d="M0,120 Q80,100 160,130 Q240,160 320,120 Q360,100 400,110" fill="none" stroke="#f5a623" strokeWidth="1" opacity="0.4" />
                              <circle cx="200" cy="90" r="8" fill="#f5a623" opacity="0.6" />
                              <circle cx="200" cy="90" r="20" fill="none" stroke="#f5a623" strokeWidth="1" opacity="0.3" />
                            </svg>
                          </div>
                          <div className="text-center z-10 relative">
                            <MapPin size={24} style={{ color: "#f5a623" }} className="mx-auto mb-1" />
                            <p className="text-xs font-body font-semibold" style={{ color: "var(--amber)" }}>Brasil</p>
                          </div>
                          {/* Map zoom controls */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            <button className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shadow" style={{ background: "var(--surface-card)", color: "var(--text-main)" }}>+</button>
                            <button className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold shadow" style={{ background: "var(--surface-card)", color: "var(--text-main)" }}>−</button>
                          </div>
                        </div>
                        <p className="absolute bottom-1 right-2 text-[9px] font-body" style={{ color: "var(--text-dimmer)" }}>
                          Clique no mapa para adicionar um pin com raio ajustável.
                        </p>
                      </div>
                    </div>
                  </FormCard>

                  {/* Nav buttons */}
                  <div className="flex justify-between pt-3">
                    <button
                      onClick={() => setStage("campaign")}
                      className="px-5 py-2.5 rounded-xl text-sm font-heading font-semibold transition-all hover:opacity-80"
                      style={{ border: "1px solid var(--border-color)", color: "var(--text-dim)", background: "var(--surface-card)" }}
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={() => setStage("ad")}
                      className="px-7 py-2.5 rounded-xl text-sm font-heading font-bold transition-all hover:brightness-110 active:scale-95"
                      style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419", boxShadow: "0 4px 14px rgba(245,166,35,0.3)" }}
                    >
                      Próximo: Anúncio →
                    </button>
                  </div>
                </div>
              )}

              {/* ════ STAGE: Ad ════ */}
              {stage === "ad" && (
                <div className="space-y-5 animate-fade-up">
                  <FormCard>
                    <p className="font-body font-semibold text-sm mb-3" style={{ color: "var(--text-main)" }}>
                      Criativo do anúncio
                    </p>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>Nome do anúncio</label>
                        <input
                          defaultValue="Novo anúncio de Leads"
                          className="w-full px-4 py-3 rounded-xl border text-sm font-body outline-none transition-all"
                          style={{ background: "var(--surface-card)", borderColor: "var(--border-color)", color: "var(--text-main)" }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#f5a623")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>Texto principal</label>
                        <textarea
                          rows={3}
                          placeholder="Texto que aparece acima do anúncio..."
                          className="w-full px-4 py-3 rounded-xl border text-sm font-body outline-none resize-none transition-all"
                          style={{ background: "var(--surface-card)", borderColor: "var(--border-color)", color: "var(--text-main)" }}
                          onFocus={(e) => (e.currentTarget.style.borderColor = "#f5a623")}
                          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>Título</label>
                          <input
                            placeholder="Ex: Sorriso perfeito em 30 dias"
                            className="w-full px-4 py-3 rounded-xl border text-sm font-body outline-none transition-all"
                            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)", color: "var(--text-main)" }}
                            onFocus={(e) => (e.currentTarget.style.borderColor = "#f5a623")}
                            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                          />
                        </div>
                        <CtaDropdown />
                      </div>
                    </div>
                  </FormCard>
                  <div className="flex justify-between pt-3">
                    <button
                      onClick={() => setStage("adset")}
                      className="px-5 py-2.5 rounded-xl text-sm font-heading font-semibold transition-all hover:opacity-80"
                      style={{ border: "1px solid var(--border-color)", color: "var(--text-dim)", background: "var(--surface-card)" }}
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={() => setStage("review")}
                      className="px-7 py-2.5 rounded-xl text-sm font-heading font-bold transition-all hover:brightness-110 active:scale-95"
                      style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419", boxShadow: "0 4px 14px rgba(245,166,35,0.3)" }}
                    >
                      Revisar →
                    </button>
                  </div>
                </div>
              )}

              {/* ════ STAGE: Review ════ */}
              {stage === "review" && (
                <div className="space-y-5 animate-fade-up">
                  <FormCard>
                    <p className="font-body font-semibold text-base mb-4" style={{ color: "var(--text-main)" }}>
                      Revisão da campanha
                    </p>
                    <div className="space-y-3">
                      <ReviewRow label="Cliente" value={client} />
                      <ReviewRow label="Nome da campanha" value={campaignName} />
                      <ReviewRow label="Orçamento" value={`${budgetMode.toUpperCase()} — R$ ${dailyBudget}/dia`} />
                      <ReviewRow label="Conjunto de anúncios" value={adSetName} />
                      <ReviewRow label="Local da conversão" value={convLocation} />
                    </div>
                  </FormCard>
                  <div className="flex justify-between pt-3">
                    <button
                      onClick={() => setStage("ad")}
                      className="px-5 py-2.5 rounded-xl text-sm font-heading font-semibold transition-all hover:opacity-80"
                      style={{ border: "1px solid var(--border-color)", color: "var(--text-dim)", background: "var(--surface-card)" }}
                    >
                      ← Voltar
                    </button>
                    <button
                      onClick={() => navigate("/campaigns")}
                      className="px-7 py-2.5 rounded-xl text-sm font-heading font-bold transition-all hover:brightness-110 active:scale-95"
                      style={{ background: "linear-gradient(135deg, #f5a623, #e8920d)", color: "#0f1419", boxShadow: "0 4px 14px rgba(245,166,35,0.3)" }}
                    >
                      Publicar campanha 🚀
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Info panel ── */}
          <div
            className="w-60 flex-shrink-0 border-l overflow-y-auto py-5 px-4 space-y-5"
            style={{
              background: "var(--surface-card)",
              borderColor: "var(--border-color)",
            }}
          >
            {/* Campaign score */}
            <div>
              <p className="font-heading font-bold text-sm mb-3" style={{ color: "var(--text-main)" }}>
                Pontuação da campanha
              </p>
              <div className="flex items-start gap-3">
                <CircularProgress value={score} />
                <p className="text-xs font-body leading-relaxed mt-1" style={{ color: "var(--text-dim)" }}>
                  Quanto mais campos obrigatórios preenchidos, maior a pontuação.
                </p>
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border-color)" }} />

            {/* Ad preview */}
            <div>
              <p className="font-heading font-bold text-sm mb-1" style={{ color: "var(--text-main)" }}>
                Prévia do anúncio
              </p>
              <p className="text-xs font-body mb-3" style={{ color: "var(--text-dim)" }}>
                Visualização simplificada antes da publicação.
              </p>

              {/* Preview card */}
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  border: "1px solid var(--border-color)",
                  background: "var(--surface-bg)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className="h-28 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #fff8ee 0%, #fef3c7 50%, #fde68a 100%)" }}
                >
                  <div className="text-center px-3">
                    <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: "rgba(245,166,35,0.15)" }}>
                      <Sparkles size={20} style={{ color: "#f5a623" }} />
                    </div>
                    <p className="text-xs font-body" style={{ color: "#d4880a" }}>
                      Selecione imagens na etapa do anúncio
                    </p>
                  </div>
                </div>
                <div className="p-3" style={{ borderTop: "1px solid var(--border-color)" }}>
                  <p className="font-heading font-bold text-xs" style={{ color: "var(--text-main)" }}>
                    {campaignName || "Sorriso perfeito em 30 dias"}
                  </p>
                  <p className="text-[11px] font-body mt-0.5" style={{ color: "var(--text-dim)" }}>
                    Condições especiais para primeira consulta.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ height: 1, background: "var(--border-color)" }} />

            {/* Score breakdown */}
            <div>
              <p className="font-heading font-semibold text-[10px] tracking-widest mb-3" style={{ color: "var(--text-dimmer)" }}>
                COMPLETUDE
              </p>
              <div className="space-y-2.5">
                <ScoreItem label="Cliente" done={client !== "Selecione um cliente..."} />
                <ScoreItem label="Nome da campanha" done={!!campaignName} />
                <ScoreItem label="Orçamento" done={!!dailyBudget} />
                <ScoreItem label="Conjunto de anúncios" done={!!adSetName} />
                <ScoreItem label="Localização" done={true} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helper sub-components ── */

function StepItem({
  active,
  completed,
  onClick,
  icon,
  stepNum,
  label,
  sublabel,
  isLast,
}: {
  active: boolean;
  completed: boolean;
  onClick: () => void;
  icon: React.ReactNode;
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
      {/* Circle indicator */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all"
        style={{
          background: completed
            ? "rgba(245,166,35,0.12)"
            : active
            ? "#f5a623"
            : "var(--surface-bg)",
          border: completed
            ? "2px solid #f5a623"
            : active
            ? "2px solid #f5a623"
            : "2px solid var(--border-color)",
          boxShadow: active ? "0 0 0 4px rgba(245,166,35,0.12)" : "none",
        }}
      >
        {completed ? (
          <Check size={13} style={{ color: "#f5a623" }} strokeWidth={2.5} />
        ) : (
          <span
            style={{
              color: active ? "#0f1419" : "var(--text-dimmer)",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-heading, 'Space Grotesk', sans-serif)",
            }}
          >
            {stepNum}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-1.5">
        <p
          className="text-sm font-heading font-semibold leading-tight truncate"
          style={{ color: active ? "var(--amber)" : completed ? "var(--text-main)" : "var(--text-dim)" }}
        >
          {label}
        </p>
        {sublabel && (
          <p
            className="text-[11px] font-body mt-0.5 truncate"
            style={{ color: "var(--text-dimmer)" }}
          >
            {sublabel}
          </p>
        )}
      </div>
    </button>
  );
}

function FormCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function BudgetOption({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all"
      style={{
        borderColor: selected ? "#f5a623" : "var(--border-color)",
        background: selected ? "rgba(245,166,35,0.05)" : "var(--surface-bg)",
      }}
    >
      <div
        className="w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-all"
        style={{
          borderColor: selected ? "#f5a623" : "var(--border-hover)",
          background: selected ? "#f5a623" : "transparent",
        }}
      >
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <div>
        <p className="text-sm font-body font-semibold" style={{ color: "var(--text-main)" }}>{title}</p>
        <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>{subtitle}</p>
      </div>
    </button>
  );
}

function CtaDropdown() {
  const ctaOptions = ["Saiba Mais", "Agendar", "Inscrever-se", "Entre em Contato"];
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(ctaOptions[0]);
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-body font-medium" style={{ color: "var(--text-main)" }}>CTA</label>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-4 py-3 rounded-xl border text-sm font-body text-left flex items-center justify-between transition-all"
          style={{
            background: "var(--surface-card)",
            borderColor: open ? "#f5a623" : "var(--border-color)",
            color: "var(--text-main)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <span>{selected}</span>
          <ChevronDown size={14} className={cn("transition-transform flex-shrink-0", open && "rotate-180")} style={{ color: "var(--text-dim)" }} />
        </button>
        {open && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden z-50 shadow-xl"
            style={{ background: "var(--dropdown-bg)", borderColor: "var(--border-color)" }}
          >
            {ctaOptions.map((c) => (
              <button
                key={c}
                onClick={() => { setSelected(c); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm font-body flex items-center gap-2 transition-colors"
                style={{ color: c === selected ? "var(--amber)" : "var(--text-dim)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}
              >
                {c === selected && <Check size={12} style={{ color: "var(--amber)" }} />}
                {c !== selected && <span className="w-3" />}
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>{label}</span>
      <span className="text-xs font-body font-semibold text-right" style={{ color: "var(--text-main)" }}>{value}</span>
    </div>
  );
}

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