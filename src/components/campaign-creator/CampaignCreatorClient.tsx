"use client";

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { CampaignCreatorFooter } from "@/components/campaign-creator/CampaignCreatorFooter";
import { CampaignCreatorHeader } from "@/components/campaign-creator/CampaignCreatorHeader";
import { CampaignCreatorPreview } from "@/components/campaign-creator/CampaignCreatorPreview";
import { CampaignCreatorTree } from "@/components/campaign-creator/CampaignCreatorTree";
import {
  CampaignDraftProvider,
  useCampaignDraft
} from "@/components/campaign-creator/CampaignDraftContext";
import { ObjectiveSelectModal } from "@/components/campaign-creator/ObjectiveSelectModal";
import { AdSetStep } from "@/components/campaign-creator/steps/AdSetStep";
import { AdStep } from "@/components/campaign-creator/steps/AdStep";
import { CampaignStep } from "@/components/campaign-creator/steps/CampaignStep";
import { ReviewStep } from "@/components/campaign-creator/steps/ReviewStep";
import { useRouter } from "@/i18n/navigation";
import {
  validateAdSetStep,
  validateAdStep,
  validateCampaignStep
} from "@/lib/campaign-draft";

function CampaignCreatorInner() {
  const t = useTranslations("campaignCreator");
  const router = useRouter();
  const {
    activeNode,
    payload,
    objectiveChosen,
    setObjectiveChosen,
    draftId,
    flushSave
  } = useCampaignDraft();
  const [showObjective, setShowObjective] = useState(!objectiveChosen);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePublish = useCallback(() => {
    setPublishError(null);
    const errs = [
      validateCampaignStep(payload),
      validateAdSetStep(payload),
      validateAdStep(payload)
    ].filter(Boolean);
    if (errs.length) {
      setPublishError(t(errs[0] as Parameters<typeof t>[0]));
      return;
    }

    startTransition(async () => {
      await flushSave();
      const res = await fetch("/api/meta/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: payload.clientSlug,
          draft: payload,
          draftTemplateId: draftId ?? undefined
        })
      });
      const j = (await res.json()) as {
        ok?: boolean;
        campaignId?: string;
        error?: string;
        message?: string;
      };
      if (!j.ok || !j.campaignId) {
        setPublishError(j.message ?? j.error ?? t("publishFailed"));
        return;
      }
      try {
        await fetch("/api/meta/discover", { method: "POST" });
      } catch {
        /* sync best-effort */
      }
      const qs = payload.clientSlug ? `?client=${encodeURIComponent(payload.clientSlug)}` : "";
      router.push(`/campaigns/${j.campaignId}${qs}`);
    });
  }, [draftId, flushSave, payload, router, t]);

  return (
    <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] flex-col bg-[var(--surface)]">
      <ObjectiveSelectModal
        open={showObjective || !objectiveChosen}
        onClose={() => {
          if (objectiveChosen) setShowObjective(false);
        }}
      />
      <CampaignCreatorHeader />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-56 shrink-0 border-r border-slate-200 bg-white lg:block">
          <CampaignCreatorTree />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            {activeNode === "campaign" ? <CampaignStep /> : null}
            {activeNode === "adset" ? <AdSetStep /> : null}
            {activeNode === "ad" ? <AdStep /> : null}
            {activeNode === "review" ? <ReviewStep /> : null}
            {publishError ? <p className="text-xs text-red-600">{publishError}</p> : null}
          </div>
        </main>
        <div className="hidden w-72 shrink-0 border-l border-slate-200 bg-white xl:block">
          <CampaignCreatorPreview />
        </div>
      </div>
      <CampaignCreatorFooter onPublish={handlePublish} publishing={isPending} />
    </div>
  );
}

export function CampaignCreatorClient({
  initialDraftId,
  initialClientSlug
}: {
  initialDraftId?: string;
  initialClientSlug?: string;
}) {
  return (
    <CampaignDraftProvider initialDraftId={initialDraftId} initialClientSlug={initialClientSlug}>
      <CampaignCreatorInner />
    </CampaignDraftProvider>
  );
}
