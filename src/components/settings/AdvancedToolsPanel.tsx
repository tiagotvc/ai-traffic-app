"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, Copy, Plug2, Sparkles, Trash2 } from "lucide-react";

type ClientOpt = { id: string; name: string };
type McpTokenRow = { id: string; label: string | null; createdAt: string; lastUsedAt: string | null };

function fmt(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

function SectionCard({
  icon,
  title,
  desc,
  children
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ui-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "rgba(124,58,237,0.12)", color: "var(--violet-bright)" }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h3>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------------- MCP ---------------- */
function McpSection({ t }: { t: (k: string) => string }) {
  const [disabled, setDisabled] = useState(false);
  const [tokens, setTokens] = useState<McpTokenRow[]>([]);
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/mcp/tokens");
    if (res.status === 404) {
      setDisabled(true);
      return;
    }
    const j = await res.json().catch(() => null);
    if (j?.ok) setTokens(j.tokens ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    setFresh(null);
    try {
      const res = await fetch("/api/mcp/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label })
      });
      const j = await res.json().catch(() => null);
      if (j?.ok && j.token) {
        setFresh(j.token);
        setLabel("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/mcp/tokens?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  if (disabled) return null;

  return (
    <SectionCard icon={<Plug2 size={16} />} title={t("mcpTitle")} desc={t("mcpDesc")}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("mcpLabelPh")}
          className="ui-input flex-1 text-xs"
        />
        <button type="button" onClick={create} disabled={busy} className="ui-btn-primary text-xs disabled:opacity-60">
          {t("mcpCreate")}
        </button>
      </div>

      {fresh ? (
        <div className="mt-3 rounded-lg border border-[rgba(245,166,35,0.35)] bg-[rgba(245,166,35,0.08)] p-3">
          <p className="text-[11px] font-medium text-[var(--amber-bright)]">{t("mcpTokenOnce")}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-[var(--surface-bg)] px-2 py-1 text-[11px] text-[var(--text-main)]">
              {fresh}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(fresh)}
              className="ui-btn-secondary flex items-center gap-1 text-[11px]"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-1.5">
        {tokens.length === 0 ? (
          <p className="text-xs text-[var(--text-dimmer)]">{t("mcpNone")}</p>
        ) : (
          tokens.map((tok) => (
            <div
              key={tok.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border-color)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[var(--text-main)]">
                  {tok.label || tok.id.slice(0, 8)}
                </p>
                <p className="text-[10px] text-[var(--text-dimmer)]">
                  {t("mcpCreatedAt")}: {fmt(tok.createdAt)} · {t("mcpLastUsed")}: {fmt(tok.lastUsedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(tok.id)}
                className="flex items-center gap-1 text-[11px] font-medium text-red-500 hover:underline"
              >
                <Trash2 size={12} />
                {t("mcpRevoke")}
              </button>
            </div>
          ))
        )}
      </div>
    </SectionCard>
  );
}

/* ---------------- CAPI ---------------- */
type CapiStatus = {
  sent24h: number;
  success24h: number;
  lastError: { at: string; eventName: string; error: string | null } | null;
};

function CapiSection({ t, clients }: { t: (k: string) => string; clients: ClientOpt[] }) {
  const [disabled, setDisabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState<CapiStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentMsg, setSentMsg] = useState<string | null>(null);

  const loadStatus = useCallback(async (id: string) => {
    if (!id) return;
    const res = await fetch(`/api/meta/capi/status?clientId=${encodeURIComponent(id)}`);
    if (res.status === 404) {
      setDisabled(true);
      return;
    }
    const j = await res.json().catch(() => null);
    if (j?.ok) setStatus(j.status);
  }, []);

  useEffect(() => {
    if (clientId) void loadStatus(clientId);
  }, [clientId, loadStatus]);

  async function sendTest() {
    if (!clientId) return;
    setBusy(true);
    setSentMsg(null);
    try {
      const res = await fetch("/api/meta/capi/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId, eventName: "PageView", testEventCode: "TEST" })
      });
      const j = await res.json().catch(() => null);
      setSentMsg(j?.ok ? "✓" : (j?.result?.error ?? j?.error ?? "erro").toString().slice(0, 80));
      await loadStatus(clientId);
    } finally {
      setBusy(false);
    }
  }

  if (disabled) return null;

  return (
    <SectionCard icon={<Activity size={16} />} title={t("capiTitle")} desc={t("capiDesc")}>
      <div className="flex flex-wrap items-center gap-2">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="ui-select flex-1 text-xs">
          <option value="">{t("selectClient")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={sendTest}
          disabled={!clientId || busy}
          className="ui-btn-secondary text-xs disabled:opacity-60"
        >
          {t("capiTest")}
        </button>
      </div>
      {sentMsg ? <p className="mt-2 text-[11px] text-[var(--text-dim)]">{sentMsg}</p> : null}

      {status ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-[var(--border-color)] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">{t("capiSent24h")}</p>
            <p className="text-lg font-bold text-[var(--text-main)]">
              {status.success24h}/{status.sent24h}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border-color)] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">{t("capiLastError")}</p>
            <p className="truncate text-xs text-[var(--text-dim)]" title={status.lastError?.error ?? ""}>
              {status.lastError ? status.lastError.error : "—"}
            </p>
          </div>
        </div>
      ) : clientId ? (
        <p className="mt-3 text-xs text-[var(--text-dimmer)]">{t("capiNoData")}</p>
      ) : null}
    </SectionCard>
  );
}

/* ---------------- Atribuição ---------------- */
type AttrPreview = { window: string; spend: number; conversions: number; cpa: number | null };

function AttributionSection({ t, clients }: { t: (k: string) => string; clients: ClientOpt[] }) {
  const [disabled, setDisabled] = useState(false);
  const [presets, setPresets] = useState<string[]>([]);
  const [windowPref, setWindowPref] = useState("default");
  const [savedFlag, setSavedFlag] = useState(false);
  const [clientId, setClientId] = useState("");
  const [preview, setPreview] = useState<AttrPreview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/meta/attribution");
      if (res.status === 404) {
        setDisabled(true);
        return;
      }
      const j = await res.json().catch(() => null);
      if (j?.ok) {
        setPresets(j.presets ?? []);
        setWindowPref(j.window ?? "default");
      }
    })();
  }, []);

  async function save() {
    setBusy(true);
    setSavedFlag(false);
    try {
      const res = await fetch("/api/meta/attribution", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ window: windowPref })
      });
      const j = await res.json().catch(() => null);
      if (j?.ok) setSavedFlag(true);
    } finally {
      setBusy(false);
    }
  }

  async function runPreview() {
    if (!clientId) return;
    setBusy(true);
    setPreview(null);
    try {
      const res = await fetch("/api/meta/attribution/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId, window: windowPref })
      });
      const j = await res.json().catch(() => null);
      if (j?.ok) setPreview({ window: j.window, spend: j.spend, conversions: j.conversions, cpa: j.cpa });
    } finally {
      setBusy(false);
    }
  }

  if (disabled) return null;

  return (
    <SectionCard icon={<Sparkles size={16} />} title={t("attrTitle")} desc={t("attrDesc")}>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={windowPref}
          onChange={(e) => {
            setWindowPref(e.target.value);
            setSavedFlag(false);
          }}
          className="ui-select flex-1 text-xs"
        >
          {presets.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <button type="button" onClick={save} disabled={busy} className="ui-btn-primary text-xs disabled:opacity-60">
          {t("attrSave")}
        </button>
        {savedFlag ? <span className="text-[11px] text-emerald-500">{t("saved")}</span> : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="ui-select flex-1 text-xs">
          <option value="">{t("selectClient")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={runPreview}
          disabled={!clientId || busy}
          className="ui-btn-secondary text-xs disabled:opacity-60"
        >
          {t("attrPreview")}
        </button>
      </div>

      {preview ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-[var(--border-color)] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">{t("attrSpend")}</p>
            <p className="text-sm font-bold text-[var(--text-main)]">R${preview.spend.toLocaleString("pt-BR")}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-color)] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">{t("attrConversions")}</p>
            <p className="text-sm font-bold text-[var(--text-main)]">{preview.conversions}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-color)] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-dimmer)]">{t("attrCpa")}</p>
            <p className="text-sm font-bold text-[var(--text-main)]">
              {preview.cpa != null ? `R$${preview.cpa.toLocaleString("pt-BR")}` : "—"}
            </p>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

/** Painel de ferramentas avançadas (MCP, CAPI, Atribuição) — aba Integrações. */
export function AdvancedToolsPanel() {
  const t = useTranslations("advancedTools");
  const [clients, setClients] = useState<ClientOpt[]>([]);

  useEffect(() => {
    fetch("/api/clients?minimal=1")
      .then((r) => r.json())
      .then((j) => {
        const list: ClientOpt[] = (j?.clients ?? []).map((c: { id: string; name: string }) => ({
          id: c.id,
          name: c.name
        }));
        setClients(list);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mt-8 space-y-4">
      <h2 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("title")}</h2>
      <McpSection t={t} />
      <CapiSection t={t} clients={clients} />
      <AttributionSection t={t} clients={clients} />
    </div>
  );
}
