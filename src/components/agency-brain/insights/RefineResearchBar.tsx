"use client";

import { useTranslations } from "next-intl";

import { AgencyBrainAiBar } from "@/components/agency-brain/AgencyBrainAiBar";
import { FeedbackSnackbar } from "@/components/agency-brain/FeedbackSnackbar";
import {
  REFINE_RESEARCH_AI_POINTS,
  useRefineResearch
} from "@/components/agency-brain/insights/useRefineResearch";

export function RefineResearchBar({
  clientId,
  onComplete
}: {
  clientId: string;
  onComplete?: () => void;
}) {
  const t = useTranslations("brainInsights");
  const { refine, loading, message, aiDisabled, pointsCost } = useRefineResearch(
    clientId,
    onComplete
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <AgencyBrainAiBar variant="compact" />
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void refine()}
          disabled={loading || aiDisabled || !clientId}
          title={aiDisabled ? t("refineNoPoints") : t("refineHint")}
        >
          {loading ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {t("refiningResearch")}
            </>
          ) : (
            <>
              {t("refineResearch")}
              <span className="rounded-md bg-white/20 px-1.5 py-px text-[10px] font-bold tabular-nums">
                {pointsCost ?? REFINE_RESEARCH_AI_POINTS} {t("refinePoints")}
              </span>
            </>
          )}
        </button>
      </div>
      <FeedbackSnackbar message={message} />
    </>
  );
}
