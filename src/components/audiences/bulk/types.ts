import type { BulkAudienceConfig, PlannedAudience } from "@/lib/audiences/bulk/types";

/** O que cada aba (builder) entrega para a moldura do Criador em lote. */
export type BulkBuilderOutput = {
  /** `null` enquanto a configuração está incompleta. */
  config: BulkAudienceConfig | null;
  /** Prévia local do plano; o servidor refaz e é quem vale. */
  preview: PlannedAudience[];
  summary: Array<{ label: string; value: string | number }>;
};

export type BulkBuilderProps = {
  clientSlug: string;
  adAccountId: string;
  disabled: boolean;
  onChange: (output: BulkBuilderOutput) => void;
};
