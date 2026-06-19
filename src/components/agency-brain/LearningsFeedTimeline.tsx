"use client";

import { useLocale, useTranslations } from "next-intl";

import { LearningCard } from "@/components/agency-brain/LearningCard";
import { groupLearningsByTimeline } from "@/lib/agency-brain/learning-timeline-groups";
import type { LearningDto } from "@/lib/agency-brain/types";

export function LearningsFeedTimeline({
  learnings,
  clientId,
  actionLoadingId,
  onApprove,
  onReject,
  onArchive,
  onEdit
}: {
  learnings: LearningDto[];
  clientId: string;
  actionLoadingId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onArchive: (id: string) => void;
  onEdit: (learning: LearningDto) => void;
}) {
  const t = useTranslations("agencyBrain");
  const locale = useLocale();
  const groups = groupLearningsByTimeline(learnings, t, locale);

  return (
    <div className="space-y-8 pb-2">
      {groups.map((group) => (
        <section key={group.id}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            {group.label}
          </h2>
          <div className="space-y-4">
            {group.items.map((learning, index) => (
              <LearningCard
                key={learning.id}
                learning={learning}
                clientId={clientId}
                index={index}
                actionLoadingId={actionLoadingId}
                onApprove={onApprove}
                onReject={onReject}
                onArchive={onArchive}
                onEdit={onEdit}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
