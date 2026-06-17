"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { BrainSummaryCards } from "@/components/agency-brain/BrainMemoryDashboard";
import { CreativePatternsPanel } from "@/components/agency-brain/CreativePatternsPanel";
import { FeedbackSnackbar } from "@/components/agency-brain/FeedbackSnackbar";
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
  const [tab, setTab] = useState<"learnings" | "patterns">("learnings");

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="shrink-0 space-y-3">
          {/* Tabs — underline style, distinct from action buttons */}
          <div className="flex gap-6 border-b border-slate-200">
            {(["learnings", "patterns"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 pb-2.5 text-sm font-medium transition ${
                  tab === key
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                {key === "learnings" ? t("tabLearnings") : t("tabPatterns")}
              </button>
            ))}
          </div>

          {tab === "patterns" ? (
            <CreativePatternsPanel clientId={clientId} />
          ) : (
            <>
              {/* Action toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
                <p className="text-xs text-slate-500">{t("learningsToolbarHint")}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                    onClick={() => void brain.handleDetectPatterns()}
                    disabled={brain.detecting || brain.aiAnalyzing}
                  >
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    {brain.detecting ? t("detecting") : t("detectPatterns")}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-50"
                    onClick={() => void brain.handleAiAnalyze()}
                    disabled={brain.detecting || brain.aiAnalyzing || brain.aiDisabled}
                    title={brain.aiDisabled ? t("aiLimit") : undefined}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    {brain.aiAnalyzing ? t("analyzingWithAi") : t("analyzeWithAi")}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                    onClick={() => {
                      setEditing(null);
                      setModalOpen(true);
                    }}
                  >
                    <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    {t("newLearning")}
                  </button>
                </div>
              </div>

              <BrainSummaryCards summary={brain.summary} compact />

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
                sortBy={brain.sortBy}
                sortDir={brain.sortDir}
                sortOptions={brain.learningSortOptions}
                onSortByChange={(v) => brain.setSortBy(v as typeof brain.sortBy)}
                onSortDirChange={brain.setSortDir}
                total={brain.total}
                listLoading={brain.listLoading}
                page={brain.page}
                totalPages={brain.totalPages}
                onPageChange={brain.setPage}
              />
            </>
          )}
        </div>

        {tab === "learnings" ? (
          <>
            <div className="learnings-scroll min-h-0 flex-1 overflow-y-auto pr-0.5">
              {brain.loading ? (
                <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-sm text-slate-500">
                  {t("loading")}
                </div>
              ) : brain.learnings.length === 0 ? (
                <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-sm text-slate-500">
                  {t("empty")}
                </div>
              ) : (
                <div className="space-y-2 pb-1">
                  {brain.learnings.map((learning, index) => (
                    <LearningCard
                      key={learning.id}
                      learning={learning}
                      clientId={clientId}
                      index={index}
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
            </div>

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
          </>
        ) : null}
      </div>

      <FeedbackSnackbar message={brain.message} />
    </>
  );
}
