"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { DsButton } from "@/design-system/components/DsButton";
import { GoogleLocationTargeting } from "@/components/campaign-creator/GoogleLocationTargeting";
import {
  defaultGoogleCampaignDraft,
  GoogleSearchCampaignDraftSchema,
  newGoogleDraftId,
  parseGoogleKeywordList,
  validateGoogleCampaignDraft,
  type GoogleKeywordDraft,
  type GoogleSearchCampaignDraft
} from "@/lib/google-campaign-draft";

type ClientOption = { id: string; slug: string; name: string; googleConnected?: boolean };
type Props = { initialClientSlug?: string; initialDraftId?: string; initialDraft?: GoogleSearchCampaignDraft; initialAiOpen?: boolean };

const inputClass = "w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] px-3 py-2 text-sm outline-none focus:border-[var(--violet)]";
const panelClass = "rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4 shadow-sm";

function LinesEditor({ values, max, min, placeholder, onChange }: { values: string[]; max: number; min: number; placeholder: string; onChange: (values: string[]) => void }) {
  return <div className="space-y-2">{values.map((value, index) => <div className="flex gap-2" key={index}>
    <input className={inputClass} maxLength={max} value={value} placeholder={`${placeholder} ${index + 1}`} onChange={(event) => onChange(values.map((item, i) => i === index ? event.target.value : item))} />
    <span className="w-12 self-center text-right text-[10px] text-[var(--text-dimmer)]">{value.length}/{max}</span>
    {values.length > min ? <button type="button" aria-label="Remover" onClick={() => onChange(values.filter((_, i) => i !== index))}><Trash2 size={15} /></button> : null}
  </div>)}{values.length < (max === 30 ? 15 : 4) ? <button type="button" className="ui-button-secondary text-xs" onClick={() => onChange([...values, ""])}><Plus size={14} /> Adicionar</button> : null}</div>;
}

function BulkKeywordImporter({ negative = false, onImport }: { negative?: boolean; onImport: (keywords: GoogleKeywordDraft[]) => void }) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const parsed = useMemo(() => parseGoogleKeywordList(raw, negative), [negative, raw]);
  return <div className="mt-2"><button type="button" className="ui-button-secondary text-xs" onClick={() => setOpen((value) => !value)}>{open ? "Fechar lista" : "Colar lista"}</button>{open ? <div className="mt-2 rounded-xl border border-dashed border-[var(--border-color)] p-3"><textarea className={`${inputClass} min-h-28 font-mono text-xs`} value={raw} onChange={(event) => setRaw(event.target.value)} placeholder={'Uma por linha\n[correspondência exata]\n"correspondência de frase"\ncorrespondência ampla'} /><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-[var(--text-dim)]">{parsed.length} palavras válidas</span><button type="button" className="ui-button-primary text-xs" disabled={!parsed.length} onClick={() => { onImport(parsed); setRaw(""); setOpen(false); }}>Adicionar à lista</button></div></div> : null}</div>;
}

export function GoogleCampaignCreatorClient({ initialClientSlug = "", initialDraftId, initialDraft, initialAiOpen = false }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<GoogleSearchCampaignDraft>(() => initialDraft ?? defaultGoogleCampaignDraft(initialClientSlug));
  const [draftId, setDraftId] = useState(initialDraftId ?? "");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [status, setStatus] = useState("Rascunho local — nenhuma alteração será enviada ao Google.");
  const [saving, setSaving] = useState(false);
  const [aiOpen, setAiOpen] = useState(initialAiOpen);
  const [aiBusiness, setAiBusiness] = useState("");
  const [aiLocation, setAiLocation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const savedOnce = useRef(Boolean(initialDraftId));

  useEffect(() => { fetch("/api/clients?minimal=1").then((r) => r.json()).then((j) => setClients(j.clients ?? [])).catch(() => {}); }, []);
  useEffect(() => {
    if (!draft.clientSlug) return;
    fetch(`/api/clients/${encodeURIComponent(draft.clientSlug)}/google-ads`).then((r) => r.json()).then((j) => {
      if (!j.ok) return;
      setDraft((current) => ({ ...current, customerId: j.linkedCustomerId ?? "", managerCustomerId: j.linkedLoginCustomerId ?? undefined }));
    }).catch(() => {});
  }, [draft.clientSlug]);

  const save = useCallback(async (quiet = false) => {
    setSaving(true);
    try {
      const parsed = GoogleSearchCampaignDraftSchema.parse(draft);
      const body = { name: parsed.campaign.name || "Rascunho Google Ads", clientId: parsed.clientSlug || null, payload: parsed };
      const response = await fetch(draftId ? `/api/campaign-templates/${draftId}` : "/api/campaign-templates", { method: draftId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Falha ao salvar");
      if (!draftId) { setDraftId(json.template.id); savedOnce.current = true; router.replace(`/campaigns/new/${json.template.id}`); }
      if (!quiet) setStatus("Rascunho salvo no aplicativo.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Falha ao salvar rascunho."); }
    finally { setSaving(false); }
  }, [draft, draftId, router]);

  useEffect(() => {
    if (!savedOnce.current || !draftId) return;
    const timer = setTimeout(() => void save(true), 900);
    return () => clearTimeout(timer);
  }, [draft, draftId, save]);

  const issues = useMemo(() => validateGoogleCampaignDraft(draft), [draft]);
  const patchCampaign = (patch: Partial<GoogleSearchCampaignDraft["campaign"]>) => setDraft((current) => ({ ...current, campaign: { ...current.campaign, ...patch } }));
  const patchGroup = (id: string, patch: Partial<GoogleSearchCampaignDraft["adGroups"][number]>) => setDraft((current) => ({ ...current, adGroups: current.adGroups.map((group) => group.id === id ? { ...group, ...patch } : group) }));

  async function generateWithAi() {
    const finalUrl = draft.adGroups[0]?.ads[0]?.finalUrl ?? "";
    if (!draft.clientSlug || aiBusiness.trim().length < 10 || !/^https:\/\//i.test(finalUrl)) { setStatus("Selecione o cliente, descreva o negócio e informe a URL HTTPS do anúncio."); return; }
    setAiLoading(true);
    try {
      const response = await fetch("/api/google-ads/creator/ai-suggestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientSlug: draft.clientSlug, objective: draft.campaign.objective, business: aiBusiness, landingPage: finalUrl, location: aiLocation }) });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Falha na IA");
      setDraft((current) => ({ ...current, campaign: { ...current.campaign, name: json.suggestions.campaignName, negativeKeywords: [...new Set(json.suggestions.groups.flatMap((group: { negativeKeywords: string[] }) => group.negativeKeywords))].map((text) => ({ text: String(text), matchType: "PHRASE" as const, negative: true })) }, adGroups: json.suggestions.groups.map((group: { name: string; keywords: string[]; headlines: string[]; descriptions: string[] }) => ({ id: newGoogleDraftId("group"), name: group.name, keywords: group.keywords.map((text) => ({ text, matchType: "PHRASE" as const, negative: false })), ads: [{ id: newGoogleDraftId("ad"), name: `RSA — ${group.name}`, finalUrl, path1: "", path2: "", headlines: group.headlines, descriptions: group.descriptions }] })), meta: { ...current.meta, creationMode: "ai", aiProvider: json.provider } }));
      setAiOpen(false); setStatus("Sugestões aplicadas. Revise tudo antes de salvar.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Falha ao gerar sugestões."); }
    finally { setAiLoading(false); }
  }

  async function validateStructure() {
    setValidating(true);
    try {
      const response = await fetch("/api/google-ads/creator/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error((json.issues ?? [json.error]).join(" · "));
      setStatus(json.localOnly ? `Estrutura válida: ${json.operationCount} operações preparadas. O dry-run Google segue travado até a aprovação.` : `Dry-run aprovado pelo Google: ${json.operationCount} operações válidas.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Falha na validação."); }
    finally { setValidating(false); }
  }

  return <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface-bg)] p-4 md:p-6">
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-4 shadow-sm sm:p-5">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC04]" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#4285F4]">Google Ads · Pesquisa</p>
              <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-dim)]">Rascunho</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Criador de campanha</h1>
            <p className="mt-1 text-sm text-[var(--text-dim)]">Estruture e salve agora; publique quando a escrita da API for aprovada.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <DsButton variant="accentOutline" size="sm" onClick={() => setAiOpen((value) => !value)}>
              <Sparkles size={15} />
              Gerar com IA
            </DsButton>
            <DsButton variant="secondary" size="sm" disabled={validating || issues.length > 0} onClick={() => void validateStructure()}>
              <CheckCircle2 size={15} />
              {validating ? "Validando…" : "Validar estrutura"}
            </DsButton>
            <DsButton variant="primary" size="sm" disabled={saving} onClick={() => void save()}>
              <Save size={15} />
              {saving ? "Salvando…" : "Salvar rascunho"}
            </DsButton>
          </div>
        </div>
      </header>
      <p className="ui-alert-info text-sm">{status}</p>
      {aiOpen ? <section className={panelClass}><h2 className="font-semibold">Assistente de estrutura e anúncios</h2><p className="mb-3 text-xs text-[var(--text-dim)]">A IA sugere grupos, palavras-chave, negativas, títulos e descrições. Nada é publicado.</p><div className="grid gap-3 md:grid-cols-2"><textarea className={`${inputClass} min-h-24`} value={aiBusiness} onChange={(e) => setAiBusiness(e.target.value)} placeholder="Descreva negócio, oferta, diferenciais e público…"/><input className={inputClass} value={aiLocation} onChange={(e) => setAiLocation(e.target.value)} placeholder="Região atendida (opcional)"/></div><button type="button" className="ui-button-primary mt-3" disabled={aiLoading} onClick={() => void generateWithAi()}>{aiLoading ? "Gerando…" : "Gerar sugestões editáveis"}</button></section> : null}

      <section className={panelClass}><h2 className="mb-3 font-semibold">1. Conta e campanha</h2><div className="grid gap-3 md:grid-cols-2"><label className="text-xs">Cliente<select className={`${inputClass} mt-1`} value={draft.clientSlug} onChange={(e) => setDraft((current) => ({ ...current, clientSlug: e.target.value, customerId: "" }))}><option value="">Selecione…</option>{clients.filter((client) => client.googleConnected).map((client) => <option key={client.id} value={client.slug}>{client.name}</option>)}</select></label><label className="text-xs">Conta Google Ads<input className={`${inputClass} mt-1`} value={draft.customerId ? draft.customerId.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : "Não vinculada"} readOnly /></label><label className="text-xs md:col-span-2">Nome<input className={`${inputClass} mt-1`} value={draft.campaign.name} onChange={(e) => patchCampaign({ name: e.target.value })}/></label><label className="text-xs">Objetivo<select className={`${inputClass} mt-1`} value={draft.campaign.objective} onChange={(e) => patchCampaign({ objective: e.target.value as "traffic" | "leads" | "sales" })}><option value="traffic">Tráfego</option><option value="leads">Leads</option><option value="sales">Vendas</option></select></label><label className="text-xs">Orçamento diário (R$)<input type="number" min="1" className={`${inputClass} mt-1`} value={draft.campaign.dailyBudgetBRL} onChange={(e) => patchCampaign({ dailyBudgetBRL: Number(e.target.value) })}/></label><label className="text-xs">Início (opcional)<input type="date" className={`${inputClass} mt-1`} value={draft.campaign.startDate ?? ""} onChange={(e) => patchCampaign({ startDate: e.target.value || undefined })}/></label><label className="text-xs">Término (opcional)<input type="date" className={`${inputClass} mt-1`} value={draft.campaign.endDate ?? ""} onChange={(e) => patchCampaign({ endDate: e.target.value || undefined })}/></label></div></section>

      <section className={panelClass}><h2 className="mb-3 font-semibold">2. Lance e segmentação</h2><div className="grid gap-3 md:grid-cols-3"><label className="text-xs">Estratégia<select className={`${inputClass} mt-1`} value={draft.campaign.bidding.strategy} onChange={(e) => patchCampaign({ bidding: { strategy: e.target.value as GoogleSearchCampaignDraft["campaign"]["bidding"]["strategy"] } })}><option value="maximize_clicks">Maximizar cliques</option><option value="maximize_conversions">Maximizar conversões</option><option value="maximize_conversion_value">Maximizar valor</option><option value="manual_cpc">CPC manual</option></select></label><label className="text-xs">Limite/meta de lance (R$)<input type="number" min="0" step="0.01" className={`${inputClass} mt-1`} value={draft.campaign.bidding.maxCpcBRL ?? draft.campaign.bidding.targetCpaBRL ?? ""} onChange={(e) => patchCampaign({ bidding: { ...draft.campaign.bidding, ...(draft.campaign.bidding.strategy === "maximize_conversions" ? { targetCpaBRL: Number(e.target.value) || undefined } : { maxCpcBRL: Number(e.target.value) || undefined }) } })}/></label><label className="text-xs">Idioma<select className={`${inputClass} mt-1`} value={draft.campaign.languageIds[0]} onChange={(e) => patchCampaign({ languageIds: [e.target.value] })}><option value="1014">Português</option><option value="1000">Inglês</option><option value="1003">Espanhol</option></select></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.campaign.searchPartners} onChange={(e) => patchCampaign({ searchPartners: e.target.checked })}/> Parceiros de pesquisa</label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.campaign.locationPresence === "presence"} onChange={(e) => patchCampaign({ locationPresence: e.target.checked ? "presence" : "presence_or_interest" })}/> Somente presença na região</label></div><GoogleLocationTargeting locations={draft.campaign.locations} onChange={(locations) => patchCampaign({ locations })}/></section>

      {draft.adGroups.map((group, groupIndex) => <section className={panelClass} key={group.id}><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">3. Grupo {groupIndex + 1}</h2>{draft.adGroups.length > 1 ? <button type="button" onClick={() => setDraft((current) => ({ ...current, adGroups: current.adGroups.filter((item) => item.id !== group.id) }))}><Trash2 size={17}/></button> : null}</div><input className={inputClass} value={group.name} onChange={(e) => patchGroup(group.id, { name: e.target.value })} placeholder="Nome do grupo"/><div className="mt-4 grid gap-5 lg:grid-cols-2"><div><h3 className="mb-2 text-sm font-medium">Palavras-chave</h3>{group.keywords.map((keyword, index) => <div className="mb-2 flex gap-2" key={index}><input className={inputClass} value={keyword.text} onChange={(e) => patchGroup(group.id, { keywords: group.keywords.map((item, i) => i === index ? { ...item, text: e.target.value } : item) })} placeholder="palavra-chave"/><select className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-card)] px-2 text-xs" value={keyword.matchType} onChange={(e) => patchGroup(group.id, { keywords: group.keywords.map((item, i) => i === index ? { ...item, matchType: e.target.value as "EXACT" | "PHRASE" | "BROAD" } : item) })}><option value="EXACT">Exata</option><option value="PHRASE">Frase</option><option value="BROAD">Ampla</option></select>{group.keywords.length > 1 ? <button type="button" onClick={() => patchGroup(group.id, { keywords: group.keywords.filter((_, i) => i !== index) })}><Trash2 size={15}/></button> : null}</div>)}<div className="flex gap-2"><button type="button" className="ui-button-secondary text-xs" onClick={() => patchGroup(group.id, { keywords: [...group.keywords, { text: "", matchType: "PHRASE", negative: false }] })}><Plus size={14}/> Palavra-chave</button></div><BulkKeywordImporter onImport={(keywords) => patchGroup(group.id, { keywords: [...group.keywords.filter((item) => item.text.trim()), ...keywords] })}/></div><div><h3 className="mb-2 text-sm font-medium">Anúncio responsivo</h3>{group.ads.slice(0, 1).map((ad) => <div className="space-y-3" key={ad.id}><input className={inputClass} value={ad.finalUrl} placeholder="https://seusite.com/pagina" onChange={(e) => patchGroup(group.id, { ads: [{ ...ad, finalUrl: e.target.value }] })}/><div className="grid grid-cols-2 gap-2"><input className={inputClass} maxLength={15} value={ad.path1} placeholder="Caminho 1" onChange={(e) => patchGroup(group.id, { ads: [{ ...ad, path1: e.target.value }] })}/><input className={inputClass} maxLength={15} value={ad.path2} placeholder="Caminho 2" onChange={(e) => patchGroup(group.id, { ads: [{ ...ad, path2: e.target.value }] })}/></div><div><p className="mb-2 text-xs font-medium">Títulos</p><LinesEditor values={ad.headlines} min={3} max={30} placeholder="Título" onChange={(headlines) => patchGroup(group.id, { ads: [{ ...ad, headlines }] })}/></div><div><p className="mb-2 text-xs font-medium">Descrições</p><LinesEditor values={ad.descriptions} min={2} max={90} placeholder="Descrição" onChange={(descriptions) => patchGroup(group.id, { ads: [{ ...ad, descriptions }] })}/></div></div>)}</div></div></section>)}
      <button type="button" className="ui-button-secondary" onClick={() => setDraft((current) => ({ ...current, adGroups: [...current.adGroups, { id: newGoogleDraftId("group"), name: `Grupo de anúncios ${current.adGroups.length + 1}`, keywords: [{ text: "", matchType: "PHRASE", negative: false }], ads: [{ id: newGoogleDraftId("ad"), name: "Anúncio responsivo 1", finalUrl: current.adGroups[0]?.ads[0]?.finalUrl ?? "", path1: "", path2: "", headlines: ["", "", ""], descriptions: ["", ""] }] }] }))}><Plus size={16}/> Adicionar grupo</button>
      <section className={panelClass}><h2 className="font-semibold">4. Palavras-chave negativas</h2><p className="mt-1 text-xs text-[var(--text-dim)]">Inclua as negativas antes de revisar a campanha. Você pode colar listas prontas usando a mesma notação de correspondência.</p><BulkKeywordImporter negative onImport={(keywords) => patchCampaign({ negativeKeywords: [...draft.campaign.negativeKeywords, ...keywords] })}/>{draft.campaign.negativeKeywords.length ? <div className="mt-3 flex flex-wrap gap-2">{draft.campaign.negativeKeywords.map((keyword, index) => <button type="button" key={`${keyword.text}-${index}`} className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs" title="Clique para remover" onClick={() => patchCampaign({ negativeKeywords: draft.campaign.negativeKeywords.filter((_, i) => i !== index) })}>{keyword.matchType === "EXACT" ? `[${keyword.text}]` : keyword.matchType === "PHRASE" ? `“${keyword.text}”` : keyword.text} ×</button>)}</div> : <p className="mt-3 text-xs text-amber-700">Nenhuma palavra-chave negativa adicionada.</p>}</section>
      <section className={panelClass}><h2 className="font-semibold">5. Revisão do rascunho</h2>{issues.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="mt-2 text-sm text-emerald-700">Estrutura completa para validação futura no Google.</p>}<p className="mt-3 text-xs text-[var(--text-dim)]">A publicação real permanece desativada até a aprovação do developer token para criação e gerenciamento.</p></section>
    </div>
  </div>;
}
