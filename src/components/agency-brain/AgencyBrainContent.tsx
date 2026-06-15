"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  BrainMemoryExtras,
  BrainSummaryCards
} from "@/components/agency-brain/BrainMemoryDashboard";
import { FeedbackBanner } from "@/components/agency-brain/FeedbackBanner";
import { LearningCard } from "@/components/agency-brain/LearningCard";
import { LearningFilters } from "@/components/agency-brain/LearningFilters";
import { LearningFormModal } from "@/components/agency-brain/LearningFormModal";
import { useAgencyBrain } from "@/components/agency-brain/useAgencyBrain";
import type { LearningDto } from "@/lib/agency-brain/types";

export function AgencyBrainContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");
  const tCm = useTranslations("creativeMemory");
  const brain = useAgencyBrain(clientId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LearningDto | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="ui-btn-secondary text-sm"
          onClick={() => void brain.handleDetectPatterns()}
          disabled={brain.detecting || brain.aiAnalyzing}
        >
          {brain.detecting ? t("detecting") : t("detectPatterns")}
        </button>
        <button
          type="button"
          className="ui-btn-primary text-sm"
          onClick={() => void brain.handleAiAnalyze()}
          disabled={brain.detecting || brain.aiAnalyzing || brain.aiDisabled}
          title={brain.aiDisabled ? tCm("aiLimit") : undefined}
        >
          {brain.aiAnalyzing ? tCm("analyzingWithAi") : tCm("analyzeWithAi")}
        </button>
        <button
          type="button"
          className="ui-btn-secondary text-sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          {t("newLearning")}
        </button>
      </div>

      <FeedbackBanner message={brain.message} />

      <BrainSummaryCards summary={brain.summary} />
      <BrainMemoryExtras summary={brain.summary} />

      <LearningFilters
        search={brain.search}
        category={brain.category}
        impact={brain.impact}
        status={brain.status}
        source={brain.source}
        onSearchChange={brain.setSearch}
        onCategoryChange={brain.setCategory}
        onImpactChange={brain.setImpact}
        onStatusChange={brain.setStatus}
        onSourceChange={brain.setSource}
      />

      {brain.loading ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loading")}</div>
      ) : brain.learnings.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("empty")}</div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">{t("resultsCount", { count: brain.total })}</p>
            {brain.listLoading ? (
              <span className="text-xs text-slate-400">{t("updating")}</span>
            ) : null}
          </div>
          {brain.learnings.map((learning) => (
            <LearningCard
              key={learning.id}
              learning={learning}
              clientId={clientId}
              actionLoadingId={brain.actionLoadingId}
              onApprove={(id) => void brain.patchAction(id, "approve")}
              onReject={(id) => void brain.patchAction(id, "reject")}
              onArchive={(id) => void brain.patchAction(id, "archive")}
              onEdit={(item) => {
                setEditing(item);
                setModalOpen(true);
              }}
            />
          ))}
          {brain.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                className="ui-btn-secondary text-xs"
                disabled={brain.page <= 1}
                onClick={() => brain.setPage((p) => Math.max(1, p - 1))}
              >
                {t("prevPage")}
              </button>
              <span className="text-xs text-slate-500">
                {t("pageOf", { page: brain.page, total: brain.totalPages })}
              </span>
              <button
                type="button"
                className="ui-btn-secondary text-xs"
                disabled={brain.page >= brain.totalPages}
                onClick={() => brain.setPage((p) => Math.min(brain.totalPages, p + 1))}
              >
                {t("nextPage")}
              </button>
            </div>
          ) : null}
        </div>
      )}

      <LearningFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={async (form) => {
          const ok = await brain.handleSave(form, editing);
          if (ok) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        initial={editing}
        campaigns={brain.campaigns}
        saving={brain.saving}
      />
    </div>
  );
}
