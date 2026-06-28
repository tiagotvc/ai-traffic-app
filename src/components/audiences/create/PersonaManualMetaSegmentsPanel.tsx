"use client";

import { useTranslations } from "next-intl";

import { PersonaSegmentChipList } from "@/components/audiences/create/PersonaSegmentChipList";
import { MetaTargetingSelect, type TargetingItem } from "@/components/MetaTargetingSelect";
import {
  META_SEGMENT_LIMITS,
  countSegmentsByType,
  type AudienceTargetingSuggestionItem
} from "@/lib/audience-targeting-shared";

type Props = {
  segments: AudienceTargetingSuggestionItem[];
  onChange: (segments: AudienceTargetingSuggestionItem[]) => void;
  disabled?: boolean;
  /** When false, hides search inputs and shows chips only (e.g. preview recap). */
  showSearch?: boolean;
};

function segmentsToTargetingItems(
  segments: AudienceTargetingSuggestionItem[],
  type: AudienceTargetingSuggestionItem["type"]
): TargetingItem[] {
  return segments
    .filter((s) => s.type === type)
    .map((s) => ({
      value: s.id,
      label: s.name,
      meta: { kind: type }
    }));
}

export function PersonaManualMetaSegmentsPanel({
  segments,
  onChange,
  disabled,
  showSearch = true
}: Props) {
  const tAud = useTranslations("audiences");
  const tCc = useTranslations("campaignCreator");

  function tryAdd(item: TargetingItem, type: AudienceTargetingSuggestionItem["type"]) {
    const counts = countSegmentsByType(segments);
    if (counts[type] >= META_SEGMENT_LIMITS[type]) return;
    if (segments.some((s) => s.id === item.value)) return;
    onChange([...segments, { type, id: item.value, name: item.label }]);
  }

  function handleRemove(itemId: string) {
    onChange(segments.filter((s) => s.id !== itemId));
  }

  return (
    <div
      data-persona-meta-segments
      className="sm:col-span-2 space-y-3 rounded-lg border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-3"
    >
      <div>
        <p className="campaign-creator-orion-section-label text-[var(--ui-accent)]">
          {tAud("personaManualMetaSegmentsTitle")}
        </p>
        <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--text-dim)]">
          {tAud("personaManualMetaSegmentsHint")}
        </p>
      </div>

      {showSearch ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-[var(--text-dimmer)]">
              {tCc("aiAudienceSegmentsInterests")}
            </p>
            <MetaTargetingSelect
              type="interest"
              placeholder={tAud("personaManualInterestsPlaceholder")}
              selected={segmentsToTargetingItems(segments, "interest")}
              onAdd={(item) => tryAdd(item, "interest")}
              onRemove={handleRemove}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-[var(--text-dimmer)]">
              {tCc("aiAudienceSegmentsBehaviors")}
            </p>
            <MetaTargetingSelect
              type="behavior"
              placeholder={tAud("personaManualBehaviorsPlaceholder")}
              selected={segmentsToTargetingItems(segments, "behavior")}
              onAdd={(item) => tryAdd(item, "behavior")}
              onRemove={handleRemove}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-[var(--text-dimmer)]">
              {tCc("aiAudienceSegmentsDemographics")}
            </p>
            <MetaTargetingSelect
              type="demographic"
              placeholder={tAud("personaManualDemographicsPlaceholder")}
              selected={segmentsToTargetingItems(segments, "demographic")}
              onAdd={(item) => tryAdd(item, "demographic")}
              onRemove={handleRemove}
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}

      {segments.length > 0 ? (
        <PersonaSegmentChipList
          items={segments}
          onRemove={handleRemove}
          allowRemoveLast
          segmentChipClass={() => "rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] text-[var(--ui-accent)]"}
        />
      ) : showSearch ? (
        <p className="text-[10px] text-[var(--text-dimmer)]">{tAud("personaManualMetaSegmentsEmpty")}</p>
      ) : null}
    </div>
  );
}
