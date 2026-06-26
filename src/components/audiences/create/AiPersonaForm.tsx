"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { AiAudienceTargetingForm } from "@/components/audiences/create/AiAudienceTargetingForm";
import type { PersonaRepairSeed } from "@/lib/persona-targeting-types";

type Props = {
  clientSlug: string;
  adAccountId: string;
  repairSeed?: PersonaRepairSeed;
  /** Omit title/close row when rendered inside DsModal. */
  embedded?: boolean;
  onClose: () => void;
  onSaved: (personaId?: string) => void;
};

export function AiPersonaForm({ clientSlug, adAccountId, repairSeed, embedded = false, onClose, onSaved }: Props) {
  const t = useTranslations("audiences");
  const [audiences, setAudiences] = useState<{ id: string; name: string }[]>([]);
  const [audiencesLoading, setAudiencesLoading] = useState(false);

  useEffect(() => {
    if (!clientSlug || !adAccountId) {
      setAudiences([]);
      return;
    }
    setAudiencesLoading(true);
    const qs = new URLSearchParams({ adAccountId });
    fetch(`/api/meta/audiences?${qs}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; audiences?: Array<{ id: string; name: string }> }) => {
        setAudiences(j.audiences ?? []);
      })
      .catch(() => setAudiences([]))
      .finally(() => setAudiencesLoading(false));
  }, [clientSlug, adAccountId]);

  const needsAccount = !clientSlug || !adAccountId;
  const isRepair = !!repairSeed;

  return (
    <div className="space-y-4">
      {!embedded ? (
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-[var(--text-main)]">
            {isRepair ? t("repairPersonaTitle") : t("newPersona")}
          </h2>
          <button type="button" className="ui-btn-secondary text-sm" onClick={onClose}>
            {t("close")}
          </button>
        </div>
      ) : null}

      {needsAccount ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("personaNeedsAdAccount")}
        </p>
      ) : null}

      <AiAudienceTargetingForm
        mode="persona_library"
        clientSlug={clientSlug}
        adAccountId={adAccountId}
        audiences={audiences}
        audiencesLoading={audiencesLoading}
        disabled={needsAccount}
        repairSeed={repairSeed}
        onSaved={(result) => onSaved(result.personaId)}
      />
    </div>
  );
}
