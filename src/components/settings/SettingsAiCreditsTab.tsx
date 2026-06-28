"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";

import { DsFlatSection } from "@/design-system";
import { SettingsFooterSave } from "@/components/settings/SettingsFooterSave";
import type { AiCreditsUsageDto, TenantAiPolicyDto } from "@/lib/ai-credits/types";

type AiCreditsPayload = {
  enabled: boolean;
  usage?: AiCreditsUsageDto;
  policy?: TenantAiPolicyDto;
};

export function SettingsAiCreditsTab() {
  const t = useTranslations("aiCredits");
  const [data, setData] = useState<AiCreditsPayload | null>(null);
  const [policy, setPolicy] = useState<TenantAiPolicyDto | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/ai-credits");
      const json = await res.json();
      if (json.ok) {
        setData({ enabled: json.enabled, usage: json.usage, policy: json.policy });
        if (json.policy) setPolicy(json.policy);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = () => {
    if (!policy) return;
    startTransition(async () => {
      setMessage(null);
      const res = await fetch("/api/settings/ai-credits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policy)
      });
      const json = await res.json();
      if (json.ok) {
        setPolicy(json.policy);
        setData((prev) => (prev ? { ...prev, usage: json.usage } : prev));
        setMessage(t("saved"));
      } else {
        setMessage(json.error ?? t("saveFailed"));
      }
    });
  };

  if (loading) {
    return <p className="text-sm text-[var(--text-dim)]">{t("loading")}</p>;
  }

  if (!data?.enabled) {
    return (
      <DsFlatSection title={t("title")}>
        <p className="text-sm text-[var(--text-dim)]">{t("notEnabled")}</p>
      </DsFlatSection>
    );
  }

  const usage = data.usage;
  const pct =
    usage && usage.creditsLimit > 0
      ? Math.min(100, Math.round((usage.creditsUsed / usage.creditsLimit) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <DsFlatSection title={t("poolTitle")} titleIcon={<Sparkles size={14} />}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              {usage?.creditsUsed ?? 0}
              <span className="text-base font-normal text-[var(--text-dim)]">
                {" "}
                / {usage?.creditsLimit ?? "—"} {t("creditsUnit")}
              </span>
            </p>
            {usage?.nearLimit ? (
              <p className="mt-1 text-sm text-amber-500">{t("nearLimit")}</p>
            ) : null}
            {usage?.atLimit ? (
              <p className="mt-1 text-sm text-rose-500">{t("atLimit")}</p>
            ) : null}
          </div>
          <Link href="/billing/addons?pack=ai" className="ui-btn-secondary text-sm">
            {t("buyCredits")}
          </Link>
        </div>
        {usage && usage.creditsLimit > 0 ? (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--ui-accent)] transition-all"
              style={{ width: `${Math.max(usage.creditsUsed > 0 ? 3 : 0, pct)}%` }}
            />
          </div>
        ) : null}
      </DsFlatSection>

      {policy ? (
        <DsFlatSection title={t("policyTitle")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-[var(--text-dim)]">{t("distributionMode")}</span>
              <select
                className="ui-input mt-1 w-full"
                value={policy.distributionMode}
                onChange={(e) =>
                  setPolicy((p) =>
                    p
                      ? {
                          ...p,
                          distributionMode: e.target.value as TenantAiPolicyDto["distributionMode"]
                        }
                      : p
                  )
                }
              >
                <option value="shared_pool">{t("modeShared")}</option>
                <option value="per_client_cap">{t("modePerClient")}</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-[var(--text-dim)]">{t("alertThreshold")}</span>
              <input
                type="number"
                min={0}
                max={100}
                className="ui-input mt-1 w-full"
                value={policy.alertThresholdPercent}
                onChange={(e) =>
                  setPolicy((p) =>
                    p ? { ...p, alertThresholdPercent: Number(e.target.value) } : p
                  )
                }
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--text-dim)]">{t("reservePercent")}</span>
              <input
                type="number"
                min={0}
                max={100}
                className="ui-input mt-1 w-full"
                value={policy.reservePercent}
                onChange={(e) =>
                  setPolicy((p) => (p ? { ...p, reservePercent: Number(e.target.value) } : p))
                }
              />
            </label>
            {policy.distributionMode === "per_client_cap" ? (
              <label className="block text-sm">
                <span className="text-[var(--text-dim)]">{t("defaultClientCap")}</span>
                <input
                  type="number"
                  min={0}
                  className="ui-input mt-1 w-full"
                  value={policy.defaultClientMonthlyCap ?? ""}
                  onChange={(e) =>
                    setPolicy((p) =>
                      p
                        ? {
                            ...p,
                            defaultClientMonthlyCap: e.target.value
                              ? Number(e.target.value)
                              : null
                          }
                        : p
                    )
                  }
                />
              </label>
            ) : null}
          </div>
          <SettingsFooterSave
            onSave={save}
            disabled={isPending}
            loading={isPending}
            loadingLabel={t("saving")}
            saveLabel={t("save")}
            message={message}
          />
        </DsFlatSection>
      ) : null}

      {usage?.byClient?.length ? (
        <DsFlatSection title={t("byClientTitle")}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-dim)]">
                  <th className="py-2 pr-4 font-medium">{t("clientCol")}</th>
                  <th className="py-2 pr-4 font-medium">{t("usedCol")}</th>
                  <th className="py-2 font-medium">{t("capCol")}</th>
                </tr>
              </thead>
              <tbody>
                {usage.byClient.map((row) => (
                  <tr key={row.clientId} className="border-b border-[var(--border)]/60">
                    <td className="py-2 pr-4">{row.clientName}</td>
                    <td className="py-2 pr-4 tabular-nums">{row.creditsUsed}</td>
                    <td className="py-2 tabular-nums">{row.monthlyCap ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DsFlatSection>
      ) : null}
    </div>
  );
}
