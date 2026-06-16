"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { Badge } from "@/components/ui/Badge";
import type { TimelineEventDto } from "@/lib/agency-brain/domain/schemas";

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
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("loading")}</div>
      ) : events.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-slate-500">{t("timelineEmpty")}</div>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />
          {events.map((event) => (
            <div key={event.id} className="relative flex gap-4 pb-6 pl-10">
              <span
                className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-violet-500 shadow"
              />
              <div className="ui-card min-w-0 flex-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{event.title}</h3>
                  <Badge>{t(`timelineType.${event.type}`)}</Badge>
                  <span className="text-xs text-slate-400">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                {event.description ? (
                  <p className="mt-2 text-sm text-slate-600">{event.description}</p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
