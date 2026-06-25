"use client";

import type {
  AudiencePersonaPreview,
  AudienceTargetingSuggestion
} from "@/lib/audience-targeting-shared";
import { PersonaSegmentChipList } from "@/components/audiences/create/PersonaSegmentChipList";

type Props = {
  personaPreview: AudiencePersonaPreview | null;
  targetingSuggestion: AudienceTargetingSuggestion | null;
};

export function AiAudiencePreviewPanel({ personaPreview, targetingSuggestion }: Props) {
  if (!personaPreview && !targetingSuggestion) return null;

  return (
    <div className="ui-brain-shelf space-y-3 rounded-xl p-4">
      {personaPreview ? (
        <div>
          <p className="font-heading text-sm font-semibold text-[var(--text-main)]">
            {personaPreview.personaName}
          </p>
          <p className="mt-1 text-xs text-[var(--text-dim)]">{personaPreview.narrative}</p>
          {personaPreview.traits.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {personaPreview.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded-full bg-[rgba(124,58,237,0.12)] px-2 py-0.5 text-[10px] text-[var(--violet)]"
                >
                  {trait}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {targetingSuggestion ? (
        <div>
          <p className="text-xs font-medium text-[var(--text-dim)]">{targetingSuggestion.title}</p>
          <p className="mt-1 text-xs text-[var(--text-dimmer)]">{targetingSuggestion.summary}</p>
          {targetingSuggestion.items.length ? (
            <div className="mt-2">
              <PersonaSegmentChipList items={targetingSuggestion.items} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
