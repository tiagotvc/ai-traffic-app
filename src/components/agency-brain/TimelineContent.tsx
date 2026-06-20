"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { Badge } from "@/components/ui/Badge";
import type { TimelineEventDto } from "@/lib/agency-brain/domain/schemas";

type TFn = ReturnType<typeof useTranslations>;

function SuggestionOutcomeBlock({
  metadata,
  t
}: {
  metadata: Record<string, unknown>;
  t: TFn;
}) {
  const status = metadata.outcomeStatus as string | undefined;
  const summary = metadata.outcomeSummary as string | undefined;
  const readyIn = metadata.outcomeReadyInDays as number | undefined;

  if (status === "pending" && readyIn != null) {
    return (
      <p className="mt-2 rounded-lg bg-[var(--surface-thead)] px-3 py-2 text-xs text-[var(--text-dim)]">
        {t("timelineOutcomePending", { days: readyIn })}
      </p>
    );
  }

  if (status === "ready" && summary) {
    return (
      <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
        {t("timelineOutcomeTitle")}: {summary}
      </p>
    );
  }

  return null;
}

export function TimelineContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");

  const [events, setEvents] = useState<TimelineEventDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/timeline?pageSize=50`
      );
      const json = await res.json();
      if (json.ok) {
        setEvents(json.items ?? []);
      } else {
        setMessage({ type: "err", text: json.error ?? t("timelineErrorLoad") });
      }
    } catch {
      setMessage({ type: "err", text: t("timelineErrorLoad") });
    } finally {
      setLoading(false);
    }
  }, [clientId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <FeedbackBanner message={message} />

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("loading")}</div>
      ) : events.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("timelineEmpty")}</div>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-[var(--border-color)]" />
          {events.map((event) => (
            <div key={event.id} className="relative flex gap-4 pb-6 pl-10">
              <span
                className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[rgba(124,58,237,0.06)]0 shadow"
              />
              <div className="ui-card min-w-0 flex-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading font-semibold text-[var(--text-main)]">{event.title}</h3>
                  <Badge>{t(`timelineType.${event.type}`)}</Badge>
                  <span className="text-xs text-[var(--text-dimmer)]">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                {event.description ? (
                  <p className="mt-2 text-sm text-[var(--text-dim)]">{event.description}</p>
                ) : null}
                {event.type === "suggestion_executed" && event.metadata ? (
                  <SuggestionOutcomeBlock metadata={event.metadata as Record<string, unknown>} t={t} />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
