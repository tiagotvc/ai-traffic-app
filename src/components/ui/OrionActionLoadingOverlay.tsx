"use client";

import { OrionTrafficLoadingOverlay } from "@/components/ui/OrionTrafficLoadingOverlay";

type Props = {
  open: boolean;
  title: string;
  message?: string;
  subtitle?: string;
  messageKey?: string;
  ariaLabelledBy?: string;
};

/** @deprecated Prefer OrionTrafficLoadingOverlay — mantido para compatibilidade. */
export function OrionActionLoadingOverlay(props: Props) {
  return <OrionTrafficLoadingOverlay {...props} />;
}
