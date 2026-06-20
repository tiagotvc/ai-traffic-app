"use client";

import { useTranslations } from "next-intl";
import { ClipboardCheck, FileText, Folder, LayoutGrid, Target } from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { Link } from "@/i18n/navigation";
import {
  computeDraftScore,
  nextNode,
  prevNode,
  validateAdSetStep,
  validateAdStep,
  validateCampaignStep,
  validatePublishDraft,
  type CreatorNode
} from "@/lib/campaign-draft";
import { UxCircularProgress, UxScoreItem, UxStepItem } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

const NODE_ORDER: CreatorNode[] = ["campaign", "adset", "ad", "review"];

export function CampaignCreatorUxHeader({ onObjectivePhase = false }: { onObjectivePhase?: boolean }) {
  const t = useTranslations("campaignCreator");
  const { payload, saving, lastSavedAt, addAdMode } = useCampaignDraft();

  return (
    <header
      className="flex w-full shrink-0 items-center gap-3 border-b px-6 py-3"
      style={{
        background: "var(--surface-bg)",
        borderColor: "var(--border-color)"
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-body text-xs leading-relaxed" style={{ color: "var(--text-dimmer)" }}>
          <Link href="/campaigns" className="hover:underline" style={{ color: "var(--text-dimmer)" }}>
            {t("breadcrumbCampaigns")}
          </Link>
          {!onObjectivePhase ? (
            <>
              {" › "}
              <span style={{ color: "var(--text-dim)" }}>{payload.campaign.name || t("newCampaign")}</span>
            </>
          ) : null}
        </p>
        {!onObjectivePhase ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-xl font-bold leading-tight md:text-2xl" style={{ color: "var(--text-main)" }}>
              {addAdMode ? t("addAdTitle") : t("title")}
            </h1>
            <span
              className="rounded px-2 py-0.5 font-heading text-xs font-semibold"
              style={{
                background: "rgba(245,166,35,0.15)",
                color: "var(--amber)",
                border: "1px solid rgba(245,166,35,0.3)"
              }}
            >
              {t("draftStatus")}
            </span>
            {saving ? (
              <span className="font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
                {t("saving")}
              </span>
            ) : lastSavedAt ? (
              <span className="font-body text-xs" style={{ color: "var(--text-dimmer)" }}>
                {t("saved")}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function CampaignCreatorUxStepper({ onObjectivePhase = false }: { onObjectivePhase?: boolean }) {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, setActiveNode, addAdMode } = useCampaignDraft();
  const visited = (n: CreatorNode) => payload.visitedNodes.includes(n);
  const closeHref =
    addAdMode && payload.meta?.targetMetaCampaignId
      ? `/campaigns/${payload.meta.targetMetaCampaignId}/ads${
          payload.clientSlug ? `?client=${encodeURIComponent(payload.clientSlug)}` : ""
        }`
      : "/campaigns";

  const steps = addAdMode
    ? [
        { node: "ad" as CreatorNode, stepNum: 1, label: t("treeAd"), sublabel: "Criativo e textos", icon: FileText },
        { node: "review" as CreatorNode, stepNum: 2, label: t("treeReview"), sublabel: "Verificar e publicar", icon: ClipboardCheck }
      ]
    : onObjectivePhase
      ? [
          { node: null as CreatorNode | null, stepNum: 1, label: "Objetivo", sublabel: "Tipo e objetivo da campanha", icon: Target },
          { node: "campaign" as CreatorNode, stepNum: 2, label: "Campanha", sublabel: t("treeCampaign"), icon: Folder, disabled: true },
          { node: "adset" as CreatorNode, stepNum: 3, label: t("treeAdset"), sublabel: "Público e orçamento", icon: LayoutGrid, disabled: true },
          { node: "ad" as CreatorNode, stepNum: 4, label: t("treeAd"), sublabel: "Criativo e textos", icon: FileText, disabled: true },
          { node: "review" as CreatorNode, stepNum: 5, label: t("treeReview"), sublabel: "Verificar e publicar", icon: ClipboardCheck, disabled: true }
        ]
      : [
          { node: "campaign" as CreatorNode, stepNum: 1, label: "Campanha", sublabel: "Nome e configuração", icon: Folder },
          { node: "adset" as CreatorNode, stepNum: 2, label: t("treeAdset"), sublabel: "Público e orçamento", icon: LayoutGrid },
          { node: "ad" as CreatorNode, stepNum: 3, label: t("treeAd"), sublabel: "Criativo e textos", icon: FileText },
          { node: "review" as CreatorNode, stepNum: 4, label: t("treeReview"), sublabel: "Verificar e publicar", icon: ClipboardCheck }
        ];

  return (
    <div
      className="hidden w-56 flex-shrink-0 flex-col border-r lg:flex"
      style={{ background: "var(--surface-bg)", borderColor: "var(--border-color)" }}
    >
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="mb-5 px-1 font-heading text-[10px] font-bold tracking-widest" style={{ color: "var(--text-dimmer)" }}>
          ETAPAS
        </p>
        <div className="relative flex flex-col">
          <div className="absolute bottom-8 left-[18px] top-8 w-px" style={{ background: "var(--border-color)" }} />
          {steps.map((s) => {
            const idx = s.node ? NODE_ORDER.indexOf(s.node) : -1;
            const activeIdx = onObjectivePhase ? -1 : NODE_ORDER.indexOf(activeNode);
            const isObjectiveStep = onObjectivePhase && s.stepNum === 1;
            return (
              <UxStepItem
                key={s.node ?? "objective"}
                stepNum={s.stepNum}
                label={s.label}
                sublabel={s.sublabel}
                active={isObjectiveStep || activeNode === s.node}
                completed={!onObjectivePhase && s.node ? activeIdx > idx : false}
                disabled={"disabled" in s && s.disabled ? true : s.node ? !visited(s.node) && activeNode !== s.node : false}
                onClick={() => {
                  if (s.node && (visited(s.node) || activeNode === s.node)) setActiveNode(s.node);
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="shrink-0 border-t px-4 py-5" style={{ borderColor: "var(--border-color)" }}>
        <Link
          href={closeHref}
          className="block w-full rounded-xl border px-4 py-2.5 text-center font-heading text-sm font-semibold"
          style={{ borderColor: "var(--border-color)", color: "var(--text-dim)", background: "var(--surface-bg)" }}
        >
          {t("close")}
        </Link>
      </div>
    </div>
  );
}

export function CampaignCreatorUxScorePanel({
  onPublish,
  publishing,
  onObjectivePhase = false
}: {
  onPublish?: () => void;
  publishing?: boolean;
  onObjectivePhase?: boolean;
}) {
  const t = useTranslations("campaignCreator");
  const tCommon = useTranslations("common");
  const { payload, activeNode, setActiveNode, addAdMode } = useCampaignDraft();
  const score = computeDraftScore(payload);

  const err = addAdMode
    ? activeNode === "ad"
      ? validatePublishDraft(payload)
      : null
    : activeNode === "campaign"
      ? validateCampaignStep(payload)
      : activeNode === "adset"
        ? validateAdSetStep(payload)
        : activeNode === "ad"
          ? validateAdStep(payload)
          : null;

  return (
    <div
      className="hidden w-60 flex-shrink-0 flex-col border-l xl:flex"
      style={{ background: "var(--surface-bg)", borderColor: "var(--border-color)" }}
    >
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
        <div>
          <p className="mb-3 font-heading text-sm font-bold" style={{ color: "var(--text-main)" }}>
            {t("campaignScore")}
          </p>
          <div className="flex items-start gap-3">
            <UxCircularProgress value={score} />
            <p className="mt-1 font-body text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
              {t("scoreHint")}
            </p>
          </div>
        </div>
        <div style={{ height: 1, background: "var(--border-color)" }} />
        <div>
          <p className="mb-3 font-heading text-[10px] font-semibold tracking-widest" style={{ color: "var(--text-dimmer)" }}>
            COMPLETUDE
          </p>
          <div className="space-y-2.5">
            <UxScoreItem label="Cliente" done={!!payload.clientSlug} />
            <UxScoreItem label="Campanha" done={!!payload.campaign.name.trim()} />
            <UxScoreItem label="Conjunto" done={!!payload.adsets[0]?.name?.trim()} />
            <UxScoreItem label="Anúncio" done={payload.ads.some((a) => a.titles.some((x) => x.trim()))} />
          </div>
        </div>
      </div>
      {!onObjectivePhase ? (
        <div className="shrink-0 space-y-2 border-t px-4 py-5" style={{ borderColor: "var(--border-color)" }}>
          {activeNode !== "campaign" && !(addAdMode && activeNode === "ad") ? (
            <button
              type="button"
              onClick={() => {
                const p = prevNode(activeNode);
                if (p) setActiveNode(p);
              }}
              className="w-full rounded-xl border px-4 py-2.5 font-heading text-sm font-semibold"
              style={{ borderColor: "var(--border-color)", color: "var(--text-dim)", background: "var(--surface-bg)" }}
            >
              {t("back")}
            </button>
          ) : null}
          {activeNode === "review" ? (
            <button
              type="button"
              disabled={publishing}
              onClick={onPublish}
              className="w-full rounded-xl px-4 py-3 font-heading text-sm font-bold shadow-lg transition-all hover:brightness-110 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #f5a623, #e8920d)",
                color: "#0f1419",
                boxShadow: "0 4px 16px rgba(245,166,35,0.35)"
              }}
            >
              {publishing ? tCommon("sending") : addAdMode ? t("publishAd") : t("publish")}
            </button>
          ) : (
            <button
              type="button"
              disabled={!!err}
              onClick={() => {
                const n = nextNode(activeNode);
                if (n) setActiveNode(n);
              }}
              className="w-full rounded-xl px-4 py-3 font-heading text-sm font-bold shadow-lg transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #f5a623, #e8920d)",
                color: "#0f1419",
                boxShadow: "0 4px 16px rgba(245,166,35,0.35)"
              }}
            >
              {t("next")}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CampaignCreatorUxFooter() {
  return null;
}
