"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import type {
  BrainSummary,
  LearningCategory,
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

export function useAgencyBrain(clientId: string) {
  const t = useTranslations("agencyBrain");
  const tCm = useTranslations("creativeMemory");

  const [clientName, setClientName] = useState("");
  const [summary, setSummary] = useState<BrainSummary | null>(null);
  const [learnings, setLearnings] = useState<LearningDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
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

  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);

  const load = useCallback(
    async (opts?: { initial?: boolean }) => {
      if (opts?.initial) setLoading(true);
      else setListLoading(true);

      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (category) params.set("category", category);
        if (impact) params.set("impact", impact);
        if (status) params.set("status", status);
        if (source) params.set("source", source);
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
    [clientId, debouncedSearch, category, impact, status, source, page, pageSize, t]
  );

  useEffect(() => {
    void load({ initial: true });
  }, [clientId]);

  useEffect(() => {
    if (!loading) void load();
  }, [debouncedSearch, category, impact, status, source, page]);

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
      if (res.status === 402 || json.code === "PLAN_LIMIT") {
        setMessage({ type: "err", text: tCm("aiLimit") });
        return;
      }
      if (json.code === "NO_AI_KEY") {
        setMessage({ type: "err", text: tCm("aiNoKey") });
        return;
      }
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? tCm("aiErrorLearnings") });
        return;
      }
      setMessage({
        type: "ok",
        text: tCm("aiSuccessLearnings", { count: json.created ?? 0 })
      });
      await load();
    } catch {
      setMessage({ type: "err", text: tCm("aiErrorLearnings") });
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

  async function patchAction(learningId: string, action: "approve" | "reject" | "archive") {
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
        { method: "PATCH" }
      );
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("errorAction") });
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
    setPage,
    campaigns,
    handleDetectPatterns,
    handleAiAnalyze,
    handleSave,
    patchAction
  };
}
