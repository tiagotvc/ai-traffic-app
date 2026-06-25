import { CampaignDrilldownProvider } from "@/components/campaign/CampaignDrilldownProvider";

export default function CampaignDrilldownLayout({ children }: { children: React.ReactNode }) {
  return <CampaignDrilldownProvider>{children}</CampaignDrilldownProvider>;
}
