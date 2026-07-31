"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { useCampaignDraft } from "@/components/campaign-creator/CampaignDraftContext";
import { adsThatWillResetLearning, isEditDraft } from "@/lib/campaign-draft";

/**
 * Aviso de que a alteração vai recriar o criativo na Meta e, com isso, jogar o
 * anúncio de volta para a fase de aprendizado. Aparece só em rascunho de edição
 * e só depois de o usuário de fato mexer em algo do criativo — antes disso não
 * há nada a avisar, e um aviso permanente vira ruído que ninguém lê.
 *
 * `scope="ad"` avisa sobre o anúncio aberto; `scope="all"` resume a campanha
 * inteira (usado na revisão, antes de salvar).
 */
export function LearningResetNotice({ scope = "ad" }: { scope?: "ad" | "all" }) {
  const t = useTranslations("campaignCreator");
  const { payload } = useCampaignDraft();

  if (!isEditDraft(payload)) return null;

  const affected = adsThatWillResetLearning(payload);
  if (!affected.length) return null;

  if (scope === "ad" && !affected.some((a) => a.id === payload.activeAdId)) return null;

  return (
    <div
      className="ui-alert-warning flex items-start gap-2 text-xs"
      role="status"
      aria-live="polite"
    >
      <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">{t("learningResetTitle")}</p>
        <p>
          {scope === "all"
            ? t("learningResetSummary", {
                count: affected.length,
                names: affected.map((a) => a.name).join(", ")
              })
            : t("learningResetBody")}
        </p>
      </div>
    </div>
  );
}
