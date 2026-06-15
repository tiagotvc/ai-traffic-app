"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { LearningFormModal } from "@/components/agency-brain/LearningFormModal";
import { ClientDetailTabs } from "@/components/client/ClientDetailTabs";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import type {
  BrainSummary,
  LearningCategory,
  LearningDto,
  LearningImpact,
  LearningSource,
  LearningStatus
} from "@/lib/agency-brain/types";

type SummaryCard = { key: string; value: number; label: string };

function statusVariant(status: LearningStatus): "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "APPROVED":
      return "success";
    case "SUGGESTED":
      return "warning";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

export function AgencyBrainClient({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");
  const tOverview = useTranslations("clientOverview");

  const [clientName, setClientName] = useState("");
  const [summary, setSummary] = useState<BrainSummary | null>(null);
  const [learnings, setLearnings] = useState<LearningDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<LearningCategory | "">("");
  const [impact, setImpact] = useState<LearningImpact | "">("");
  const [status, setStatus] = useState<LearningStatus | "">("");
  const [source, setSource] = useState<LearningSource | "">("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LearningDto | null>(null);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (impact) params.set("impact", impact);
      if (status) params.set("status", status);
      if (source) params.set("source", source);
      params.set("pageSize", "50");

      const [summaryRes, learnRes, clientRes] = await Promise.all([
        fetch(`/api/clients/${encodeURIComponent(clientId)}/brain-summary`),
        fetch(`/api/clients/${encodeURIComponent(clientId)}/learnings?${params}`),
        fetch(`/api/clients/${encodeURIComponent(clientId)}`)
      ]);

      const summaryJson = await summaryRes.json();
      const learnJson = await learnRes.json();
      const clientJson = await clientRes.json();

      if (summaryJson.ok) setSummary(summaryJson.summary);
      if (learnJson.ok) {
        setLearnings(learnJson.items ?? []);
        setTotal(learnJson.total ?? 0);
      }
      if (clientJson.client) {
        setClientName(clientJson.client.name);
        setCampaigns(
          (clientJson.client.campaigns ?? []).map(
            (c: { id: string; name: string }) => ({ id: c.id, name: c.name })
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, search, category, impact, status, source]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSuggest() {
    setSuggesting(true);
    try {
      await fetch(`/api/clients/${encodeURIComponent(clientId)}/learnings/suggest`, {
        method: "POST"
      });
      await load();
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSave(form: {
    title: string;
    description: string;
    category: LearningCategory;
    impact: LearningImpact;
    confidence: LearningImpact;
    tags: string;
    metaCampaignId: string;
  }) {
    setSaving(true);
    try {
      const body = {
        title: form.title,
        description: form.description,
        category: form.category,
        impact: form.impact,
        confidence: form.confidence,
        tags: form.tags
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        metaCampaignId: form.metaCampaignId || null
      };

      if (editing) {
        await fetch(
          `/api/clients/${encodeURIComponent(clientId)}/learnings/${editing.id}`,
          { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        );
      } else {
        await fetch(`/api/clients/${encodeURIComponent(clientId)}/learnings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
      }

      setModalOpen(false);
      setEditing(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function patchAction(learningId: string, action: "approve" | "reject" | "archive") {
    await fetch(
      `/api/clients/${encodeURIComponent(clientId)}/learnings/${learningId}/${action}`,
      { method: "PATCH" }
    );
    await load();
  }

  const summaryCards: SummaryCard[] = summary
    ? [
        { key: "total", value: summary.total, label: t("cardTotal") },
        { key: "high", value: summary.highImpact, label: t("cardHighImpact") },
        { key: "creative", value: summary.creativeCount, label: t("cardCreative") },
        { key: "audience", value: summary.audienceCount, label: t("cardAudience") },
        { key: "pending", value: summary.pendingSuggestions, label: t("cardPending") }
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/clients" className="text-xs font-medium text-slate-500 hover:text-slate-700">
            ← {tOverview("breadcrumb")}
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {clientName || tOverview("client")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ui-btn-secondary text-sm"
            onClick={() => void handleSuggest()}
            disabled={suggesting}
          >
            {suggesting ? t("generating") : t("generateSuggestions")}
          </button>
          <button
            type="button"
            className="ui-btn-primary text-sm"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            {t("newLearning")}
          </button>
        </div>
      </div>

      <ClientDetailTabs clientSlug={clientId} activeTab="agency-brain" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <div key={card.key} className="ui-card p-4">
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            <div className="text-xs text-slate-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="ui-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className="ui-input"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="ui-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as LearningCategory | "")}
          >
            <option value="">{t("filterAllCategories")}</option>
            {(
              [
                "CREATIVE",
                "AUDIENCE",
                "OFFER",
                "COPY",
                "BUDGET",
                "LANDING_PAGE",
                "SEASONALITY",
                "GENERAL"
              ] as LearningCategory[]
            ).map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={impact}
            onChange={(e) => setImpact(e.target.value as LearningImpact | "")}
          >
            <option value="">{t("filterAllImpact")}</option>
            {(["LOW", "MEDIUM", "HIGH"] as LearningImpact[]).map((i) => (
              <option key={i} value={i}>
                {t(`impact.${i}`)}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as LearningStatus | "")}
          >
            <option value="">{t("filterAllStatus")}</option>
            {(["SUGGESTED", "APPROVED", "REJECTED", "ARCHIVED"] as LearningStatus[]).map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
          <select
            className="ui-select"
            value={source}
            onChange={(e) => setSource(e.target.value as LearningSource | "")}
          >
            <option value="">{t("filterAllSource")}</option>
            {(["MANUAL", "RULE", "AI", "IMPORTED"] as LearningSource[]).map((s) => (
              <option key={s} value={s}>
                {t(`source.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loading")}</div>
      ) : learnings.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("empty")}</div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{t("resultsCount", { count: total })}</p>
          {learnings.map((l) => (
            <div key={l.id} className="ui-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{l.title}</h3>
                    <Badge variant={statusVariant(l.status)}>{t(`status.${l.status}`)}</Badge>
                    <Badge>{t(`category.${l.category}`)}</Badge>
                    <Badge>{t(`impact.${l.impact}`)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{l.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span>{t(`source.${l.source}`)}</span>
                    <span>·</span>
                    <span>{t(`confidence.${l.confidence}`)}</span>
                    <span>·</span>
                    <span>{new Date(l.createdAt).toLocaleDateString()}</span>
                  </div>
                  {l.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {l.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {l.metricSnapshot ? (
                    <div className="mt-2 text-xs text-slate-500">
                      {[
                        l.metricSnapshot.cpa != null ? `CPA R$ ${l.metricSnapshot.cpa.toFixed(2)}` : null,
                        l.metricSnapshot.ctr != null ? `CTR ${l.metricSnapshot.ctr.toFixed(2)}%` : null,
                        l.metricSnapshot.roas != null ? `ROAS ${l.metricSnapshot.roas.toFixed(2)}` : null,
                        l.metricSnapshot.spend != null ? `Spend R$ ${l.metricSnapshot.spend.toFixed(0)}` : null
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {l.status === "SUGGESTED" ? (
                    <>
                      <button
                        type="button"
                        className="ui-btn-primary text-xs"
                        onClick={() => void patchAction(l.id, "approve")}
                      >
                        {t("approve")}
                      </button>
                      <button
                        type="button"
                        className="ui-btn-danger text-xs"
                        onClick={() => void patchAction(l.id, "reject")}
                      >
                        {t("reject")}
                      </button>
                    </>
                  ) : null}
                  {l.status !== "ARCHIVED" ? (
                    <button
                      type="button"
                      className="ui-btn-secondary text-xs"
                      onClick={() => {
                        setEditing(l);
                        setModalOpen(true);
                      }}
                    >
                      {t("edit")}
                    </button>
                  ) : null}
                  {l.status !== "ARCHIVED" ? (
                    <button
                      type="button"
                      className="ui-btn-secondary text-xs"
                      onClick={() => void patchAction(l.id, "archive")}
                    >
                      {t("archive")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <LearningFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        initial={editing}
        campaigns={campaigns}
        saving={saving}
      />
    </div>
  );
}
