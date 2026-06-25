"use client";

import { DsSwitch } from "@/design-system";

/** Toggle estilo Meta: ativo = verde à direita; pausado = trilho visível à esquerda.
 *  Wrapper fino sobre `DsSwitch` (mantém a semântica `active`). */
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
    <DsSwitch checked={active} onChange={onChange} disabled={disabled} ariaLabel={ariaLabel} />
  );
}
