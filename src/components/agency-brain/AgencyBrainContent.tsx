"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { AgencyBrainEmptyGuide } from "@/components/agency-brain/AgencyBrainEmptyGuide";
import { useAgencyBrainClient } from "@/components/agency-brain/AgencyBrainClientContext";
import { AgencyLearningCard } from "@/components/agency-brain/AgencyLearningCard";
import { CreativePatternsPanel } from "@/components/agency-brain/CreativePatternsPanel";
import { FeedbackSnackbar } from "@/components/agency-brain/FeedbackSnackbar";
import type { LearningContentFilterId } from "@/components/agency-brain/LearningContentFilter";
import { LearningsFeedTimeline } from "@/components/agency-brain/LearningsFeedTimeline";
import { LearningsHero } from "@/components/agency-brain/LearningsHero";
import {
  LearningsFilterBar,
  type CategoryChipId,
  type FeedViewId
} from "@/components/agency-brain/LearningsFilterBar";
import { LearningFilters } from "@/components/agency-brain/LearningFilters";
import { LearningFormModal } from "@/components/agency-brain/LearningFormModal";
import { LearningPagination } from "@/components/agency-brain/LearningPagination";
import { MarketLearningsPanel } from "@/components/agency-brain/MarketLearningsPanel";
import { useAgencyBrain } from "@/components/agency-brain/useAgencyBrain";
import { useAgencyLearnings } from "@/components/agency-brain/useAgencyLearnings";
import { useMarketLearnings } from "@/components/agency-brain/useMarketLearnings";
import {
  type LearningLensId
} from "@/lib/agency-brain/learning-lens-catalog";
import type { LearningScopeId } from "@/lib/agency-brain/learning-scopes";
import type { LearningDto } from "@/lib/agency-brain/types";

function statusForFeedView(view: FeedViewId): "SUGGESTED" | "APPROVED" {
  return view === "insights" ? "SUGGESTED" : "APPROVED";
}

export function AgencyBrainContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");
  const { clients, onClientChange } = useAgencyBrainClient();
  const brain = useAgencyBrain(clientId);

  const [scope, setScope] = useState<LearningScopeId>("client");
  const [feedView, setFeedView] = useState<FeedViewId>("insights");
  const [categoryChip, setCategoryChip] = useState<CategoryChipId>("ALL");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const agency = useAgencyLearnings(scope === "agency");
  const market = useMarketLearnings(clientId, scope === "market");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LearningDto | null>(null);
  const [contentFilter, setContentFilter] = useState<LearningContentFilterId>("learnings");

  const showPatterns = contentFilter === "patterns" && scope === "client";
  const showLearningsList =
    contentFilter === "learnings" && (scope === "client" || scope === "agency");
  const showMarketPanel = contentFilter === "learnings" && scope === "market";
  const showFeedControls = contentFilter === "learnings" && scope !== "market";

  useEffect(() => {
    if (scope === "client" && contentFilter === "learnings") {
      brain.setStatus(statusForFeedView(feedView));
    }
  }, [clientId, scope, contentFilter, feedView]);

  function applyClientLens(lensId: LearningLensId) {
    const status = statusForFeedView(feedView);

    if (lensId === "ALL") {
      brain.setCategory("");
      brain.setImpact("");
      brain.setStatus(status);
    } else if (lensId === "HIGH_IMPACT") {
      brain.setCategory("");
      brain.setImpact("HIGH");
      brain.setStatus(status);
    } else {
      brain.setCategory(lensId);
      brain.setImpact("");
      brain.setStatus(status);
    }
    brain.setPage(1);
  }

  function handleCategoryChip(chip: CategoryChipId) {
    setCategoryChip(chip);
    const lensId: LearningLensId = chip === "ALL" ? "ALL" : chip;

    if (scope === "agency") {
      if (lensId === "ALL") {
        agency.setCategory("");
        agency.setImpact("");
      } else {
        agency.setCategory(lensId);
        agency.setImpact("");
      }
      agency.setPage(1);
      return;
    }

    applyClientLens(lensId);
  }

  function handleFeedViewChange(view: FeedViewId) {
    setFeedView(view);
    brain.setStatus(statusForFeedView(view));
    brain.setPage(1);
  }

  function handleScopeSelect(next: LearningScopeId) {
    setScope(next);
    if (next === "client") brain.setPage(1);
    if (next === "agency") agency.setPage(1);
  }

  const feedbackMessage = scope === "market" ? market.message : brain.message;
  const showClientActions = scope === "client" && contentFilter === "learnings";

  const advancedActiveCount = useMemo(() => {
    const contentExtra = contentFilter === "patterns" ? 1 : 0;
    if (scope === "agency") {
      return (
        [agency.category, agency.impact, agency.source, agency.confidence, agency.tagFilter].filter(
          Boolean
        ).length + contentExtra
      );
    }
    return (
      [
        brain.category,
        brain.impact,
        brain.source,
        brain.confidence,
        brain.dateFrom,
        brain.dateTo,
        brain.tagFilter
      ].filter(Boolean).length + contentExtra
    );
  }, [scope, agency, brain, contentFilter]);

  const listSearch = scope === "agency" ? agency.search : brain.search;
  const onListSearchChange = scope === "agency" ? agency.setSearch : brain.setSearch;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 space-y-4">
        <LearningsHero
          showActions={showClientActions}
          summary={brain.summary}
          detecting={brain.detecting}
          aiAnalyzing={brain.aiAnalyzing}
          aiDisabled={brain.aiDisabled}
          onDetectPatterns={() => void brain.handleDetectPatterns()}
          onAiAnalyze={() => void brain.handleAiAnalyze()}
          onNewLearning={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        />

        <LearningsFilterBar
          scope={scope}
          onScopeChange={handleScopeSelect}
          feedView={feedView}
          onFeedViewChange={handleFeedViewChange}
          categoryChip={categoryChip}
          onCategoryChipChange={handleCategoryChip}
          search={listSearch}
          onSearchChange={onListSearchChange}
          advancedOpen={advancedOpen}
          onAdvancedToggle={() => setAdvancedOpen((v) => !v)}
          advancedActiveCount={advancedActiveCount}
          showFeedControls={showFeedControls}
        />

        {advancedOpen ? (
          <div className="rounded-lg border border-slate-200/80 bg-white/50 p-2">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t("filterContentLabel")}
            </label>
            <select
              className="ui-select mb-2 !py-1 text-xs"
              value={contentFilter}
              onChange={(e) => {
                const next = e.target.value as LearningContentFilterId;
                setContentFilter(next);
                if (next === "patterns") setScope("client");
              }}
            >
              <option value="learnings">{t("contentFilterLearnings")}</option>
              <option value="patterns">{t("contentFilterPatterns")}</option>
            </select>

            {scope === "agency" ? (
              <LearningFilters
                embedded
                hidePrimaryRow
                expanded={advancedOpen}
                onExpandedChange={setAdvancedOpen}
                clientInExpanded
                clients={clients}
                clientSlug={clientId}
                onClientChange={onClientChange}
                search={agency.search}
                category={agency.category}
                impact={agency.impact}
                status=""
                source={agency.source}
                confidence={agency.confidence}
                dateFrom=""
                dateTo=""
                tagFilter={agency.tagFilter}
                onSearchChange={agency.setSearch}
                onCategoryChange={agency.setCategory}
                onImpactChange={agency.setImpact}
                onStatusChange={() => undefined}
                onSourceChange={agency.setSource}
                onConfidenceChange={agency.setConfidence}
                onDateFromChange={() => undefined}
                onDateToChange={() => undefined}
                onTagFilterChange={agency.setTagFilter}
                sortBy={agency.sortBy}
                sortDir={agency.sortDir}
                sortOptions={[
                  { value: "createdAt", label: t("sortBy.createdAt") },
                  { value: "confidenceScore", label: t("sortBy.confidence") },
                  { value: "impact", label: t("sortBy.impact") }
                ]}
                onSortByChange={(v) => agency.setSortBy(v as typeof agency.sortBy)}
                onSortDirChange={agency.setSortDir}
                total={agency.total}
                listLoading={agency.listLoading}
                page={agency.page}
                totalPages={agency.totalPages}
                onPageChange={agency.setPage}
                hideStatus
                hideDateFilters
                hidePagination
              />
            ) : (
              <LearningFilters
                embedded
                hidePrimaryRow
                expanded={advancedOpen}
                onExpandedChange={setAdvancedOpen}
                clientInExpanded
                clients={clients}
                clientSlug={clientId}
                onClientChange={onClientChange}
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
                onCategoryChange={(c) => {
                  brain.setCategory(c);
                  setCategoryChip(c || "ALL");
                }}
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
                hideStatus
                hidePagination
              />
            )}
          </div>
        ) : null}
      </div>

      <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
        {showPatterns ? (
          <div className="learnings-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-8 sm:px-6">
            <CreativePatternsPanel clientId={clientId} embedded />
          </div>
        ) : null}

        {showLearningsList && scope === "client" ? (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <div className="learnings-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-8 sm:px-6">
              {brain.loading ? (
                <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-sm text-slate-500">
                  {t("loading")}
                </div>
              ) : brain.learnings.length === 0 ? (
                <AgencyBrainEmptyGuide
                  title={
                    feedView === "insights"
                      ? t("memoryViewEmptyReview")
                      : t("memoryViewEmptySaved")
                  }
                  description={t("empty")}
                  steps={[
                    t("mvp_learnings_step1"),
                    t("mvp_learnings_step2"),
                    t("mvp_learnings_step3")
                  ]}
                />
              ) : (
                <LearningsFeedTimeline
                  learnings={brain.learnings}
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
              )}
            </div>

            <LearningPagination
              page={brain.page}
              totalPages={brain.totalPages}
              total={brain.total}
              listLoading={brain.listLoading}
              onPageChange={brain.setPage}
            />

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
        ) : null}

        {showLearningsList && scope === "agency" ? (
          <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
            <div className="learnings-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-8 sm:px-6">
              {agency.loading ? (
                <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 text-sm text-slate-500">
                  {t("loading")}
                </div>
              ) : agency.items.length === 0 ? (
                <AgencyBrainEmptyGuide
                  title={t("learningScopeAgencyEmptyTitle")}
                  description={t("learningScopeAgencyEmpty")}
                  steps={[t("mvp_learnings_step1"), t("learningScopeAgencyEmptyStep")]}
                />
              ) : (
                <div className="space-y-4 pb-2">
                  {agency.items.map((learning, index) => (
                    <AgencyLearningCard key={learning.id} learning={learning} index={index} />
                  ))}
                </div>
              )}
            </div>

            <LearningPagination
              page={agency.page}
              totalPages={agency.totalPages}
              total={agency.total}
              listLoading={agency.listLoading}
              onPageChange={agency.setPage}
            />
          </div>
        ) : null}

        {showMarketPanel ? (
          <div className="learnings-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-8 sm:px-6">
            <MarketLearningsPanel
              clientId={clientId}
              items={market.items}
              niche={market.niche}
              aggregated={market.aggregated}
              loading={market.loading}
              scanning={market.scanning}
              synthesizing={market.synthesizing}
              aiDisabled={market.aiDisabled}
              hasScan={market.hasScan}
              coverageLevel={market.coverageLevel}
              adsAnalyzed={market.adsAnalyzed}
              competitorsScanned={market.competitorsScanned}
              apiConfigured={market.apiConfigured}
              scannedAt={market.scannedAt}
              onScan={() => void market.handleScan()}
              onSynthesize={() => void market.handleSynthesize()}
            />
          </div>
        ) : null}
      </div>

      <FeedbackSnackbar message={feedbackMessage} />
    </div>
  );
}
