"use client";

import { CheckCircle2, ChevronDown, ChevronRight, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CampaignCreatorScoreBar } from "./CampaignCreatorScoreBar";
import { CampaignCreatorSummaryModal } from "./CampaignCreatorSummaryModal";
import { useCampaignDraft } from "./CampaignDraftContext";
import { buildCampaignDraftChecklist, computeDraftScore, type CampaignDraftCheckKey } from "@/lib/campaign-draft";
import { computeWizardProgressPercent } from "@/uxpilot-ui/adapters/CampaignCreatorUxChrome";

const CHECK_LABEL_KEY: Record<CampaignDraftCheckKey, string> = {
  campaign: "checklistCampaign", adset: "checklistAdset", ad: "checklistAd",
  media: "checklistMedia", titles: "checklistTitles"
};

function LegacyScoreCard({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, addAdMode } = useCampaignDraft();
  const score = computeDraftScore(payload);
  const progress = computeWizardProgressPercent({ addAdMode, activeNode });
  const checklist = useMemo(() => buildCampaignDraftChecklist(payload), [payload]);
  return <div className="campaign-creator-sidebar-card">
    <div className="flex items-center justify-between gap-2"><h3 className="font-heading text-sm font-semibold text-[var(--text-main)]">{t("campaignScore")}</h3><span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ui-accent)]">{t("wizardProgress", { percent: progress })}</span></div>
    <div className="mt-3 flex items-center gap-4"><span className="inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border-[5px] border-[var(--ui-accent)] text-lg font-bold text-[var(--ui-accent)]">{score}</span><p className="text-xs leading-relaxed text-[var(--text-dim)]">{t("scoreHint")}</p></div>
    <div className="mt-3"><CampaignCreatorScoreBar value={score} /></div>
    <div className="mt-3 space-y-1.5">{checklist.map((item) => <div key={item.key} className={`campaign-creator-summary-checklist-item ${item.complete ? "campaign-creator-summary-checklist-item--complete" : "campaign-creator-summary-checklist-item--incomplete"}`}><CheckCircle2 size={14} /><span className="truncate">{t(CHECK_LABEL_KEY[item.key] as Parameters<typeof t>[0])}</span></div>)}</div>
    <button type="button" onClick={onOpen} className="ui-btn-accent-outline mt-3 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold">{t("sidebarContextCampaign")}<ChevronRight size={14} /></button>
  </div>;
}

export function LegacyCampaignSidebarContent() {
  const [open, setOpen] = useState(false);
  return <><LegacyScoreCard onOpen={() => setOpen(true)} /><CampaignCreatorSummaryModal open={open} onClose={() => setOpen(false)} /></>;
}

export function LegacyCampaignMobileSummary() {
  const t = useTranslations("campaignCreator");
  const { payload, activeNode, addAdMode } = useCampaignDraft();
  const [open, setOpen] = useState(false);
  const score = computeDraftScore(payload);
  const progress = computeWizardProgressPercent({ addAdMode, activeNode });
  const checklist = useMemo(() => buildCampaignDraftChecklist(payload), [payload]);
  return <div className="campaign-creator-mobile-summary lg:hidden">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="campaign-creator-mobile-summary-card flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]"><Wallet size={18} /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[var(--text-main)]">{t("sidebarContextCampaign")}</span><span className="block text-xs text-[var(--text-dim)]">{t("mobileSummarySubtitle")}</span></span>
      <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ui-accent)]">{score}</span><ChevronDown size={18} className={open ? "rotate-180" : ""} />
    </button>
    {open ? <div className="campaign-creator-mobile-summary-card mt-2 rounded-xl border p-4"><div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-semibold">{t("campaignScore")}</h4><span className="text-xs text-[var(--ui-accent)]">{t("wizardProgress", { percent: progress })}</span></div><CampaignCreatorScoreBar value={score} /><div className="mt-3 space-y-2">{checklist.map((item) => <div key={item.key} className="flex items-center gap-2 text-xs text-[var(--text-main)]"><CheckCircle2 size={14} className={item.complete ? "text-[var(--success)]" : "text-[var(--text-dimmer)]"} />{t(CHECK_LABEL_KEY[item.key] as Parameters<typeof t>[0])}</div>)}</div></div> : null}
  </div>;
}
