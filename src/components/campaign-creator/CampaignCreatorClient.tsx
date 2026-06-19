"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { CampaignCreatorFooter } from "@/components/campaign-creator/CampaignCreatorFooter";
import { CampaignCreatorHeader } from "@/components/campaign-creator/CampaignCreatorHeader";
import { CampaignCreatorPreview } from "@/components/campaign-creator/CampaignCreatorPreview";
import { CampaignCreatorStepPanel } from "@/components/campaign-creator/CampaignCreatorStepPanel";
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
import { getActiveAd, getActiveAdset, isAddAdDraft, isAddAdsetDraft, type CreatorNode, validatePublishDraft } from "@/lib/campaign-draft";

const STEP_ORDER: CreatorNode[] = ["campaign", "adset", "ad", "review"];

function CampaignCreatorInner() {
  const t = useTranslations("campaignCreator");
  const router = useRouter();
  const {
    activeNode,
    payload,
    objectiveChosen,
    setObjectiveChosen,
    draftId,
    flushSave,
    addAdMode,
    addAdsetMode,
    inheritCampaignMode,
    addAdLoading
  } = useCampaignDraft();
  const [showObjective, setShowObjective] = useState(!objectiveChosen && !inheritCampaignMode);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const prevNodeRef = useRef(activeNode);
  const [stepDirection, setStepDirection] = useState<"forward" | "back" | "none">("none");

  useEffect(() => {
    const prev = prevNodeRef.current;
    if (prev !== activeNode) {
      const pi = STEP_ORDER.indexOf(prev);
      const ci = STEP_ORDER.indexOf(activeNode);
      if (pi >= 0 && ci >= 0) setStepDirection(ci > pi ? "forward" : "back");
      prevNodeRef.current = activeNode;
    }
  }, [activeNode]);

  const handlePublish = useCallback(() => {
    setPublishError(null);
    const err = validatePublishDraft(payload);
    if (err) {
      setPublishError(t(err as Parameters<typeof t>[0]));
      return;
    }

    startTransition(async () => {
      if (isAddAdDraft(payload)) {
        const adsetId = payload.meta?.targetMetaAdsetId;
        const campaignId = payload.meta?.targetMetaCampaignId;
        if (!adsetId || !campaignId) {
          setPublishError(t("publishFailed"));
          return;
        }

        const res = await fetch(`/api/adsets/${encodeURIComponent(adsetId)}/ads`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clientId: payload.clientSlug,
            adAccountId: payload.adAccountId,
            objective: payload.objective,
            ad: getActiveAd(payload),
            campaignName: payload.campaign.name
          })
        });
        const j = (await res.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
        };
        if (!j.ok) {
          setPublishError(j.message ?? j.error ?? t("publishFailed"));
          return;
        }
        try {
          await fetch("/api/meta/discover", { method: "POST" });
        } catch {
          /* sync best-effort */
        }
        const qs = new URLSearchParams();
        if (payload.clientSlug) qs.set("client", payload.clientSlug);
        qs.set("adset", adsetId);
        router.push(`/campaigns/${campaignId}/ads?${qs.toString()}`);
        return;
      }

      if (isAddAdsetDraft(payload)) {
        const campaignId = payload.meta?.targetMetaCampaignId;
        if (!campaignId) {
          setPublishError(t("publishFailed"));
          return;
        }

        const res = await fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/adsets`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            clientId: payload.clientSlug,
            adAccountId: payload.adAccountId,
            objective: payload.objective,
            adset: getActiveAdset(payload),
            ad: getActiveAd(payload),
            campaignName: payload.campaign.name,
            campaign: payload.campaign
          })
        });
        const j = (await res.json()) as {
          ok?: boolean;
          error?: string;
          message?: string;
          adsetId?: string;
        };
        if (!j.ok || !j.adsetId) {
          setPublishError(j.message ?? j.error ?? t("publishFailed"));
          return;
        }
        try {
          await fetch("/api/meta/discover", { method: "POST" });
        } catch {
          /* sync best-effort */
        }
        const qs = new URLSearchParams();
        if (payload.clientSlug) qs.set("client", payload.clientSlug);
        router.push(`/campaigns/${campaignId}/adsets?${qs.toString()}`);
        return;
      }

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

  if (addAdLoading) {
    return (
      <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[var(--surface)]">
        <p className="text-sm text-slate-500">{t("addAdLoading")}</p>
      </div>
    );
  }

  return (
    <div className="-mx-6 -my-6 flex min-h-[calc(100vh-4rem)] flex-col bg-[var(--surface)]">
      <ObjectiveSelectModal
        open={!inheritCampaignMode && (showObjective || !objectiveChosen)}
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
            <CampaignCreatorStepPanel
              stepKey={activeNode}
              direction={stepDirection}
            >
              {!inheritCampaignMode && activeNode === "campaign" ? <CampaignStep /> : null}
              {(!addAdMode && activeNode === "adset") || (addAdsetMode && activeNode === "adset") ? (
                <AdSetStep />
              ) : null}
              {activeNode === "ad" ? <AdStep /> : null}
              {activeNode === "review" ? <ReviewStep /> : null}
            </CampaignCreatorStepPanel>
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
  initialClientSlug,
  initialAddAd,
  initialAddAdset
}: {
  initialDraftId?: string;
  initialClientSlug?: string;
  initialAddAd?: {
    fromCampaignId: string;
    adsetId: string;
    clientSlug?: string;
  };
  initialAddAdset?: {
    fromCampaignId: string;
    clientSlug?: string;
  };
}) {
  return (
    <CampaignDraftProvider
      initialDraftId={initialDraftId}
      initialClientSlug={initialClientSlug}
      initialAddAd={initialAddAd}
      initialAddAdset={initialAddAdset}
    >
      <CampaignCreatorInner />
    </CampaignDraftProvider>
  );
}
