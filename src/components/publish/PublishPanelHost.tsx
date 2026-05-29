"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { PublishCampaignSidebar } from "@/components/publish/PublishCampaignSidebar";
import { usePublishPanel } from "@/components/publish/PublishPanelContext";

export function PublishPanelHost({ onPublished }: { onPublished?: () => void }) {
  const searchParams = useSearchParams();
  const { openPanel } = usePublishPanel();

  useEffect(() => {
    if (searchParams.get("publish") === "1") {
      const client = searchParams.get("client") ?? undefined;
      openPanel(client ? { clientSlug: client } : undefined);
    }
  }, [searchParams, openPanel]);

  return <PublishCampaignSidebar onPublished={onPublished} />;
}
