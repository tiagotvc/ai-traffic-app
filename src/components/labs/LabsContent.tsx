"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import {
  LabsCreateExperimentModal,
  type LabsExperimentFormState
} from "@/components/labs/LabsCreateExperimentModal";
import { LabsExperimentDetailModal } from "@/components/labs/LabsExperimentDetailModal";
import { LabsExperimentsList } from "@/components/labs/LabsExperimentsList";
import { LabsLabHero } from "@/components/labs/LabsLabHero";
import { isLabsExperimentRunning, partitionLabsExperiments } from "@/lib/labs/experiment-status";
import type { LabsAgentRunDto, LabsExperimentDto } from "@/lib/labs/types";

export function LabsContent() {
  const t = useTranslations("agencyBrain");

  const [items, setItems] = useState<LabsExperimentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [runs, setRuns] = useState<LabsAgentRunDto[]>([]);
  const [detail, setDetail] = useState<LabsExperimentDto | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const res = await fetch("/api/labs/experiments");
      const json = await res.json();
      if (json.ok) {
        setItems(json.items ?? []);
      } else if (!options?.silent) {
        setMessage({ type: "err", text: json.error ?? t("labsErrorLoad") });
      }
    } catch {
      if (!options?.silent) {
        setMessage({ type: "err", text: t("labsErrorLoad") });
      }
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [t]);

  const loadDetail = useCallback(async (experimentId: string) => {
    setDetailId(experimentId);
    try {
      const res = await fetch(`/api/labs/experiments/${experimentId}`);
      const json = await res.json();
      if (json.ok) {
        setDetail(json.experiment);
        setRuns(json.runs ?? []);
        setDetailOpen(true);
      }
    } catch {
      setDetail(null);
      setRuns([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { running } = useMemo(() => partitionLabsExperiments(items), [items]);

  useEffect(() => {
    const active = items.find((i) => i.id === detailId);
    if (!active || !isLabsExperimentRunning(active.status)) return;
    const timer = setInterval(() => void loadDetail(detailId!), 2000);
    return () => clearInterval(timer);
  }, [detailId, items, loadDetail]);

  useEffect(() => {
    if (!running.length) return;
    const timer = setInterval(() => void load({ silent: true }), 3000);
    return () => clearInterval(timer);
  }, [running.length, load]);

  async function handleCreate(form: LabsExperimentFormState) {
    if (
      !form.clientSlug ||
      !form.name.trim() ||
      !form.product.trim() ||
      form.selectedScientists.length === 0
    ) {
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/labs/experiments?clientId=${encodeURIComponent(form.clientSlug)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            product: form.product,
            niche: form.niche || undefined,
            market: form.market || undefined,
            objective: form.objective || undefined,
            selectedScientists: form.selectedScientists
          })
        }
      );
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("labsErrorCreate") });
        return;
      }
      setMessage({
        type: "ok",
        text: json.mock ? t("labsCreateSuccessMock") : t("labsCreateSuccess")
      });
      setCreateOpen(false);
      await load();
      if (json.experiment?.id) {
        void loadDetail(json.experiment.id);
      }
    } catch {
      setMessage({ type: "err", text: t("labsErrorCreate") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <LabsLabHero
        runningCount={running.length}
        totalCount={items.length}
        onNewExperiment={() => setCreateOpen(true)}
      />

      {message && <FeedbackBanner message={message} />}

      <LabsExperimentsList
        items={items}
        loading={loading}
        onSelect={(id) => void loadDetail(id)}
      />

      <LabsCreateExperimentModal
        open={createOpen}
        saving={saving}
        onClose={() => setCreateOpen(false)}
        onSubmit={(form) => void handleCreate(form)}
      />

      <LabsExperimentDetailModal
        open={detailOpen}
        experiment={detail}
        runs={runs}
        onClose={() => setDetailOpen(false)}
      />

      <p className="text-xs text-slate-500">
        <Link href="/agency-brain/experiments" className="underline hover:text-violet-600">
          {t("labsLegacyExperiments")}
        </Link>
      </p>
    </div>
  );
}
