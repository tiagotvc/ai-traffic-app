"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { AiCreditCostHint } from "@/components/ui/AiCreditCostHint";
import { DsButton, DsModal } from "@/design-system";
import { useAiCredits } from "@/hooks/useAiCredits";
import type { AiCreditKind } from "@/lib/ai-credits/types";

export const REPORT_AI_CREDITS = {
  kind: "generic" as const satisfies AiCreditKind,
  calls: 1
};

type Props = {
  onGenerate: (prompt: string) => Promise<boolean>;
  busy?: boolean;
};

export function ReportsAiGenerateTrigger({ onGenerate, busy = false }: Props) {
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");
  const { refresh: refreshCredits } = useAiCredits();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  async function handleGenerate() {
    if (!prompt.trim() || busy) return;
    const ok = await onGenerate(prompt.trim());
    if (ok) {
      void refreshCredits();
      setOpen(false);
      setPrompt("");
    }
  }

  function handleClose() {
    if (busy) return;
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-btn-accent inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium"
      >
        <Sparkles size={14} aria-hidden />
        <span>{t("aiGenerateButton")}</span>
        <AiCreditCostHint
          kind={REPORT_AI_CREDITS.kind}
          calls={REPORT_AI_CREDITS.calls}
          variant="pill"
        />
      </button>

      <DsModal
        open={open}
        onClose={handleClose}
        title={t("aiGenerateModalTitle")}
        subtitle={t("aiGenerateModalSubtitle")}
        titleIcon={<Sparkles size={15} strokeWidth={2.25} />}
        width="md"
        footer={
          <>
            <DsButton variant="ghost" size="sm" onClick={handleClose} disabled={busy}>
              {tCommon("cancel")}
            </DsButton>
            <DsButton
              variant="accent"
              size="sm"
              onClick={() => void handleGenerate()}
              disabled={busy || !prompt.trim()}
              className="inline-flex items-center gap-1.5"
            >
              <Sparkles size={13} aria-hidden />
              {busy ? tCommon("loading") : t("aiGenerateButton")}
            </DsButton>
          </>
        }
      >
        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void handleGenerate();
              }
            }}
            placeholder={t("aiGeneratePlaceholder")}
            rows={4}
            className="ui-input w-full resize-none text-sm"
            disabled={busy}
            autoFocus
          />
          <div className="flex justify-center">
            <AiCreditCostHint
              kind={REPORT_AI_CREDITS.kind}
              calls={REPORT_AI_CREDITS.calls}
              variant="pill"
            />
          </div>
        </div>
      </DsModal>
    </>
  );
}
