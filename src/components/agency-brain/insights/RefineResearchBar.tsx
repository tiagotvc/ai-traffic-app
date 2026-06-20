"use client";

import { useTranslations } from "next-intl";

import { FeedbackSnackbar } from "@/components/agency-brain/FeedbackSnackbar";
import { useRefineResearch } from "@/components/agency-brain/insights/useRefineResearch";

export function RefineResearchBar({
  clientId,
  onComplete
}: {
  clientId: string;
  onComplete?: () => void;
}) {
  const t = useTranslations("brainInsights");
  const { refine, loading, message, aiDisabled } = useRefineResearch(clientId, onComplete);

  return (
    <>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold shadow-md transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background: "linear-gradient(135deg, #f5a623, #e8920d)",
          color: "#0f1419",
          fontFamily: "var(--font-heading)"
        }}
        onClick={() => void refine()}
        disabled={loading || aiDisabled || !clientId}
        title={aiDisabled ? t("refineNoPoints") : t("refineHint")}
      >
        {loading ? (
          <>
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0f1419]/20 border-t-[#0f1419]" />
            {t("refiningResearch")}
          </>
        ) : (
          t("refineResearch")
        )}
      </button>
      <FeedbackSnackbar message={message} />
    </>
  );
}
