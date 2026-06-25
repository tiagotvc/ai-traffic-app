"use client";

import { useTranslations } from "next-intl";

import {
  META_SEGMENT_LIMITS,
  countSegmentsByType,
  type AudienceTargetingSuggestionItem,
  type SegmentType
} from "@/lib/audience-targeting-shared";

type Props = {
  items: AudienceTargetingSuggestionItem[];
  onRemove?: (itemId: string) => void;
  readOnly?: boolean;
  segmentChipClass?: (item: AudienceTargetingSuggestionItem) => string;
  replacementAlternativeIds?: Set<string>;
  isRepairMode?: boolean;
};

const GROUPS: Array<{ type: SegmentType; labelKey: string; chipKey: string }> = [
  { type: "interest", labelKey: "aiAudienceSegmentsInterests", chipKey: "aiAudienceChipInterest" },
  { type: "behavior", labelKey: "aiAudienceSegmentsBehaviors", chipKey: "aiAudienceChipBehavior" },
  { type: "demographic", labelKey: "aiAudienceSegmentsDemographics", chipKey: "aiAudienceChipDemo" }
];

export function PersonaSegmentChipList({
  items,
  onRemove,
  readOnly = false,
  segmentChipClass,
  replacementAlternativeIds,
  isRepairMode = false
}: Props) {
  const t = useTranslations("campaignCreator");
  const tAud = useTranslations("audiences");
  const counts = countSegmentsByType(items);

  return (
    <div className="space-y-3">
      {GROUPS.map((group) => {
        const groupItems = items.filter((item) => item.type === group.type);
        const limit = META_SEGMENT_LIMITS[group.type];
        return (
          <div key={group.type} className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)]">
              {tAud("personaSegmentCount", {
                label: t(group.labelKey),
                count: counts[group.type],
                limit
              })}
            </p>
            {groupItems.length ? (
              <div className="flex flex-wrap gap-1.5">
                {groupItems.map((item) => {
                  const chipClass =
                    segmentChipClass?.(item) ??
                    "rounded-full bg-[rgba(124,58,237,0.1)] px-2 py-0.5 text-[10px] text-[var(--violet)]";
                  const canRemove = !readOnly && onRemove && items.length > 1;
                  return (
                    <span
                      key={`${item.type}-${item.id}`}
                      className={`inline-flex items-center gap-1 ${chipClass}`}
                    >
                      <span>
                        {t(group.chipKey)}: {item.name}
                        {isRepairMode && replacementAlternativeIds?.has(item.id)
                          ? ` (${tAud("personaRepairChipReplacement")})`
                          : ""}
                      </span>
                      {canRemove ? (
                        <button
                          type="button"
                          onClick={() => onRemove(item.id)}
                          className="ml-0.5 rounded-full px-1 leading-none opacity-70 hover:opacity-100"
                          aria-label={tAud("personaSegmentRemove", { name: item.name })}
                        >
                          ×
                        </button>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-[var(--text-dimmer)]">—</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
