import type { ComponentType, CSSProperties } from "react";
import {
  Globe,
  LayoutGrid,
  Megaphone,
  MousePointerClick,
  ShoppingCart,
  Sparkles
} from "lucide-react";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import type { CampaignPresetKey } from "@/lib/campaign-presets";

export type CampaignPresetIconProps = {
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
};

export type CampaignPresetIconConfig = {
  Icon: ComponentType<CampaignPresetIconProps>;
};

const PRESET_ICONS: Record<CampaignPresetKey, CampaignPresetIconConfig> = {
  default: { Icon: LayoutGrid },
  lead_whatsapp: { Icon: WhatsAppIcon },
  lead_site: { Icon: MousePointerClick },
  sales: { Icon: ShoppingCart },
  reach: { Icon: Megaphone }
};

const CUSTOM_ICON: CampaignPresetIconConfig = { Icon: Sparkles };

export function getCampaignPresetIconConfig(key: string): CampaignPresetIconConfig {
  if (key.startsWith("custom:")) return CUSTOM_ICON;
  return PRESET_ICONS[key as CampaignPresetKey] ?? { Icon: Globe };
}
