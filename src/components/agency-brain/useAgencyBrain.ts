"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { parseAiAnalysisResponse } from "@/components/agency-brain/handleAiAnalysisResponse";
import type { FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { useAgencyBrainAi } from "@/components/agency-brain/AgencyBrainAiContext";
import type {
  BrainSummary,
  LearningCategory,
  LearningConfidence,
  LearningDto,
  LearningImpact,
  LearningSource,
  LearningStatus
} from "@/lib/agency-brain/types";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export type LearningSortBy = "createdAt" | "confidenceScore" | "impact";

export function useAgencyBrain(clientId: string) {
  const t = useTranslations("agencyBrain");
  const { aiDisabled, refresh: refreshAiStatus } = useAgencyBrainAi();

  const [clientName, setClientName] = useState("");
  const [summary, setSummary] = useState<BrainSummary | null>(null);
  const [learnings, setLearnings] = useState<LearningDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [category, setCategory] = useState<LearningCategory | "">("");
  const [impact, setImpact] = useState<LearningImpact | "">("");
  const [status, setStatus] = useState<LearningStatus | "">("");
  const [source, setSource] = useState<LearningSource | "">("");
  const [confidence, setConfidence] = useState<LearningConfidence | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sortBy, setSortBy] = useState<LearningSortBy>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);

  const load = useCallback(
    async (opts?: { initial?: boolean }) => {
      if (!clientId) {
        setSummary(null);
        setLearnings([]);
        setTotal(0);
        setClientName("");
        setCampaigns([]);
        setLoading(false);
        setListLoading(false);
        return;
      }

      if (opts?.initial) setLoading(true);
      else setListLoading(true);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (category) params.set("category", category);
        if (impact) params.set("impact", impact);
        if (status) params.set("status", status);
        if (source) params.set("source", source);
        if (confidence) params.set("confidence", confidence);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (tagFilter) params.set("tags", tagFilter);
        params.set("sortBy", sortBy);
        params.set("sortDir", sortDir);
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));

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
        } else {
          setMessage({ type: "err", text: learnJson.error ?? t("errorLoad") });
        }
        if (clientJson.client) {
          setClientName(clientJson.client.name);
          setCampaigns(
            (clientJson.client.campaigns ?? []).map(
              (c: { id: string; name: string }) => ({ id: c.id, name: c.name })
            )
          );
        }
      } catch {
        setMessage({ type: "err", text: t("errorLoad") });
      } finally {
        setLoading(false);
        setListLoading(false);
      }
    },
    [
      clientId,
      debouncedSearch,
      category,
      impact,
      status,
      source,
      confidence,
      dateFrom,
      dateTo,
      tagFilter,
      sortBy,
      sortDir,
      page,
      pageSize,
      t
    ]
  );

  useEffect(() => {
    if (!clientId) return;
    void load({ initial: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    if (!clientId || loading) return;
    void load();
  }, [
    debouncedSearch,
    category,
    impact,
    status,
    source,
    confidence,
    dateFrom,
    dateTo,
    tagFilter,
    sortBy,
    sortDir,
    page
  ]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, impact, status, source, confidence, dateFrom, dateTo, tagFilter, sortBy, sortDir]);

  async function handleDetectPatterns() {
    setDetecting(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/learnings/suggest`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("errorDetect") });
        return;
      }
      setMessage({
        type: "ok",
        text: t("detectSuccess", { count: json.created ?? 0 })
      });
      await load();
    } catch {
      setMessage({ type: "err", text: t("errorDetect") });
    } finally {
      setDetecting(false);
    }
  }

  async function handleAiAnalyze() {
    setAiAnalyzing(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/learnings/ai-suggest`,
        { method: "POST" }
      );
      const json = await res.json();
      const parsed = parseAiAnalysisResponse(res, json, {
        aiLimit: t("aiLimit"),
        aiNoKey: t("aiNoKey"),
        aiRateLimit: t("aiRateLimit"),
        aiServiceError: t("aiServiceError"),
        aiParseError: t("aiParseError"),
        aiSchemaError: t("aiSchemaError"),
        aiNoResults: t("aiNoResults"),
        aiNoMetrics: t("aiNoMetrics"),
        aiGenericError: t("aiErrorLearnings"),
        aiSuccess: (count) => t("aiSuccessLearnings", { count })
      });
      if (!parsed) return;
      setMessage(parsed.message);
      if (parsed.shouldReload) await load();
      if (parsed.shouldRefreshAiStatus) await refreshAiStatus();
    } catch {
      setMessage({ type: "err", text: t("aiErrorLearnings") });
    } finally {
      setAiAnalyzing(false);
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
  }, editing: LearningDto | null) {
    setSaving(true);
    setMessage(null);
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

      const url = editing
        ? `/api/clients/${encodeURIComponent(clientId)}/learnings/${editing.id}`
        : `/api/clients/${encodeURIComponent(clientId)}/learnings`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("errorSave") });
        return false;
      }
      setMessage({ type: "ok", text: editing ? t("savedEdit") : t("savedCreate") });
      await load();
      return true;
    } catch {
      setMessage({ type: "err", text: t("errorSave") });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function patchAction(
    learningId: string,
    action: "approve" | "reject" | "archive",
    options?: { force?: boolean }
  ) {
    if (action === "reject" || action === "archive") {
      const confirmKey =
        action === "reject" ? "confirmReject" : "confirmArchive";
      if (!window.confirm(t(confirmKey))) return;
    }

    setActionLoadingId(learningId);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/learnings/${learningId}/${action}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ force: options?.force === true })
        }
      );
      const json = await res.json();
      if (!json.ok) {
        const errText =
          json.code === "LOW_CONFIDENCE"
            ? t("approveLowConfidence")
            : json.error ?? t("errorAction");
        setMessage({ type: "err", text: errText });
        return;
      }
      setMessage({
        type: "ok",
        text:
          action === "approve"
            ? t("approvedMemory")
            : action === "reject"
              ? t("rejectedMemory")
              : t("archivedMemory")
      });
      await load();
    } catch {
      setMessage({ type: "err", text: t("errorAction") });
    } finally {
      setActionLoadingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const learningSortOptions = [
    { value: "createdAt", label: t("sortBy.createdAt") },
    { value: "confidenceScore", label: t("sortBy.confidence") },
    { value: "impact", label: t("sortBy.impact") }
  ];

  return {
    clientName,
    summary,
    learnings,
    total,
    page,
    totalPages,
    pageSize,
    loading,
    listLoading,
    saving,
    detecting,
    aiAnalyzing,
    aiDisabled,
    actionLoadingId,
    message,
    setMessage,
    search,
    setSearch,
    category,
    setCategory,
    impact,
    setImpact,
    status,
    setStatus,
    source,
    setSource,
    confidence,
    setConfidence,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    tagFilter,
    setTagFilter,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    learningSortOptions,
    setPage,
    campaigns,
    handleDetectPatterns,
    handleAiAnalyze,
    handleSave,
    patchAction
  };
}
