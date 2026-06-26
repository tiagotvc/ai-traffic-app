"use client";

import { DsSwitch } from "@/design-system";

/** Toggle de status — âmbar (light) / roxo (dark) via `.ui-switch-campaign`. */
export function CampaignStatusToggle({
  active,
  disabled,
  onChange,
  ariaLabel
}: {
  active: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <DsSwitch
      checked={active}
      onChange={onChange}
      disabled={disabled}
      ariaLabel={ariaLabel}
      size="sm"
      className="ui-switch-campaign"
    />
  );
}
