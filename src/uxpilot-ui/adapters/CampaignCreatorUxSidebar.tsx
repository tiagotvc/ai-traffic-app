"use client";

import { OrionCommanderPanel } from "@/components/campaign-creator/commander/OrionCommanderPanel";
import { LegacyCampaignSidebarContent } from "@/components/campaign-creator/LegacyCampaignSummary";
import { useCommanderAccess } from "@/hooks/useCommanderAccess";
import { CampaignCreatorUxNav } from "@/uxpilot-ui/adapters/CampaignCreatorUxChrome";

export function CampaignCreatorUxSidebar({ onPublish, publishing }: { onPublish?: () => void; publishing?: boolean }) {
  const { commander } = useCommanderAccess();
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="campaign-creator-sidebar__scroll min-h-0 flex-1 overflow-y-auto">
      <div className="campaign-creator-sidebar__inner py-1">{commander ? <OrionCommanderPanel /> : <LegacyCampaignSidebarContent />}</div>
    </div>
    <div className="campaign-creator-sidebar-footer shrink-0"><CampaignCreatorUxNav onPublish={onPublish} publishing={publishing} placement="sidebar" /></div>
  </div>;
}
