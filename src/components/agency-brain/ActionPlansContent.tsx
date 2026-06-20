"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";
import { Badge } from "@/components/ui/Badge";
import type { ActionPlanDto } from "@/lib/agency-brain/domain/schemas";

function itemStatusVariant(status: string): "neutral" | "success" | "warning" | "danger" {
  switch (status) {
    case "done":
      return "success";
    case "skipped":
      return "danger";
    default:
      return "warning";
  }
}

export function ActionPlansContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");

  const [plans, setPlans] = useState<ActionPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/clients/${encodeURIComponent(clientId)}/action-plans?pageSize=20`
      );
      const json = await res.json();
      if (json.ok) {
        setPlans(json.items ?? []);
      } else {
        setMessage({ type: "err", text: json.error ?? t("actionPlansErrorLoad") });
      }
    } catch {
      setMessage({ type: "err", text: t("actionPlansErrorLoad") });
    } finally {
      setLoading(false);
    }
  }, [clientId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/clients/${encodeURIComponent(clientId)}/action-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("actionPlansErrorCreate") });
        return;
      }
      setMessage({ type: "ok", text: t("actionPlansCreateSuccess") });
      await load();
    } catch {
      setMessage({ type: "err", text: t("actionPlansErrorCreate") });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="ui-btn-primary text-sm"
          onClick={() => void handleCreate()}
          disabled={creating}
        >
          {creating ? t("actionPlansCreating") : t("actionPlansCreate")}
        </button>
      </div>

      <FeedbackBanner message={message} />

      {loading ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("loading")}</div>
      ) : plans.length === 0 ? (
        <div className="ui-card p-8 text-center text-sm text-[var(--text-dim)]">{t("actionPlansEmpty")}</div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="ui-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading font-semibold text-[var(--text-main)]">{plan.title}</h3>
                <span className="text-xs text-[var(--text-dimmer)]">
                  {new Date(plan.generatedAt).toLocaleDateString()}
                </span>
              </div>
              {plan.items.length ? (
                <ul className="mt-3 space-y-2">
                  {plan.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-thead)] px-3 py-2"
                    >
                      <span className="text-sm text-[var(--text-dim)]">{item.title}</span>
                      <Badge variant={itemStatusVariant(item.status)}>
                        {t(`actionPlanItemStatus.${item.status}`)}
                      </Badge>
                      {item.dueDate ? (
                        <span className="text-xs text-[var(--text-dimmer)]">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-[var(--text-dim)]">{t("actionPlansNoItems")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
