"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  BrainMemoryExtras,
  BrainSummaryCards
} from "@/components/agency-brain/BrainMemoryDashboard";
import { BrainListToolbar } from "@/components/agency-brain/BrainListToolbar";
import { FeedbackBanner } from "@/components/agency-brain/FeedbackBanner";
import { LearningCard } from "@/components/agency-brain/LearningCard";
import { LearningFilters } from "@/components/agency-brain/LearningFilters";
import { LearningFormModal } from "@/components/agency-brain/LearningFormModal";
import { useAgencyBrain } from "@/components/agency-brain/useAgencyBrain";
import type { LearningDto } from "@/lib/agency-brain/types";

export function AgencyBrainContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");
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
          title={brain.aiDisabled ? t("aiLimit") : undefined}
        >
          {brain.aiAnalyzing ? t("analyzingWithAi") : t("analyzeWithAi")}
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

      <BrainListToolbar
        sortBy={brain.sortBy}
        sortDir={brain.sortDir}
        sortOptions={brain.learningSortOptions}
        onSortByChange={(v) => brain.setSortBy(v as typeof brain.sortBy)}
        onSortDirChange={brain.setSortDir}
        page={brain.page}
        totalPages={brain.totalPages}
        total={brain.total}
        onPageChange={brain.setPage}
        listLoading={brain.listLoading}
        filters={
          <LearningFilters
            search={brain.search}
            category={brain.category}
            impact={brain.impact}
            status={brain.status}
            source={brain.source}
            confidence={brain.confidence}
            dateFrom={brain.dateFrom}
            dateTo={brain.dateTo}
            tagFilter={brain.tagFilter}
            onSearchChange={brain.setSearch}
            onCategoryChange={brain.setCategory}
            onImpactChange={brain.setImpact}
            onStatusChange={brain.setStatus}
            onSourceChange={brain.setSource}
            onConfidenceChange={brain.setConfidence}
            onDateFromChange={brain.setDateFrom}
            onDateToChange={brain.setDateTo}
            onTagFilterChange={brain.setTagFilter}
          />
        }
      />

      {brain.loading ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loading")}</div>
      ) : brain.learnings.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("empty")}</div>
      ) : (
        <div className="space-y-3">
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
