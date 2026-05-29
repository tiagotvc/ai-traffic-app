"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

type Rec = {
  id: string;
  actionType: string;
  justification: string;
  targetId?: string | null;
  status: string;
};

export function AiCenterClient() {
  const t = useTranslations("aiCenter");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [chat, setChat] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ai/recommendations")
      .then((r) => r.json())
      .then((j) => {
        if (j.recommendations?.length) {
          setRecs(
            j.recommendations.map((r: Rec) => ({
              id: r.id,
              actionType: r.actionType,
              justification: r.justification,
              targetId: r.targetId,
              status: r.status
            }))
          );
        }
      })
      .catch(() => null);
  }, []);

  return (
    <div className="ui-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{t("title")}</div>
          <div className="text-xs text-slate-500">{t("subtitle")}</div>
        </div>
        <button
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await fetch("/api/ai/recommendations", { method: "POST" });
              const json = (await res.json().catch(() => null)) as { ok?: boolean; recommendations?: Rec[]; error?: string };
              if (!res.ok || !json?.ok) {
                setError(json?.error ?? t("generateFailed"));
                return;
              }
              setRecs(json.recommendations ?? []);
            });
          }}
          className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {isPending ? tCommon("generating") : t("generate")}
        </button>
      </div>

      {error ? <div className="mt-3 text-xs text-rose-300">{error}</div> : null}

      <div className="mt-4 space-y-3">
        {recs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
            {t("empty", { action: t("generateAction") })}
          </div>
        ) : (
          recs.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-violet-300">{r.actionType}</div>
                  <div className="mt-1 text-sm font-semibold">{r.targetId ?? "—"}</div>
                  <div className="mt-2 text-sm text-slate-600">{r.justification}</div>
                </div>
                <button
                  disabled={isPending || r.status !== "PENDING"}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const res = await fetch("/api/meta/apply", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ recommendationId: r.id })
                      });
                      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string };
                      if (!res.ok || !json?.ok) {
                        setError(json?.error ?? t("applyFailed"));
                        return;
                      }
                      setRecs((prev) =>
                        prev.map((x) => (x.id === r.id ? { ...x, status: "APPLIED" } : x))
                      );
                    });
                  }}
                  className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {r.status === "APPLIED" ? tCommon("applied") : tCommon("apply")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold">{t("chatTitle")}</div>
        <div className="mt-1 text-xs text-slate-500">{t("chatHint")}</div>
        <div className="mt-3 flex gap-2">
          <input
            value={chat}
            onChange={(e) => setChat(e.target.value)}
            className="w-full rounded-xl ui-input text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-600"
            placeholder={t("chatPlaceholder")}
          />
          <button
            disabled={isPending || chat.trim().length === 0}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await fetch("/api/ai/refine", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ message: chat })
                });
                const json = (await res.json().catch(() => null)) as { ok?: boolean; recommendations?: Rec[]; error?: string };
                if (!res.ok || !json?.ok) {
                  setError(json?.error ?? t("refineFailed"));
                  return;
                }
                setRecs(json.recommendations ?? []);
                setChat("");
              });
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
