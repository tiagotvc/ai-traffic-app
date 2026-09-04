"use client";

import { useEffect } from "react";
import type { PeriodState } from "@/components/PeriodFilter";
import { periodStateToParsed, rollingDaysEndingYesterday, todayIso, yesterdayIso } from "@/lib/report-period";

type Platform = "meta" | "google";
type Range = { since: string; until: string };
const recent = new Map<string, { since: string; until: string; at: number }>();
const running = new Map<string, Promise<void>>();

export function resolvePeriodRange(period: PeriodState): Range | null {
  const parsed = periodStateToParsed(period);
  if (parsed.since && parsed.until) return { since: parsed.since, until: parsed.until };
  if (parsed.preset === "today") { const day = todayIso(); return { since: day, until: day }; }
  if (parsed.preset === "yesterday") { const day = yesterdayIso(); return { since: day, until: day }; }
  if (parsed.days) return rollingDaysEndingYesterday(parsed.days);
  if (parsed.allTime) return rollingDaysEndingYesterday(365);
  return null;
}

export function requestFreshDataRange(input: { clientId?: string; platforms: Platform[]; range: Range; force?: boolean }) {
  const scope = input.clientId ?? "all";
  const platformKey = [...input.platforms].sort().join(",");
  const key = `${scope}:${platformKey}`;
  const cached = recent.get(key);
  if (!input.force && cached && Date.now() - cached.at < 10 * 60_000 && input.range.since >= cached.since && input.range.until <= cached.until) {
    return Promise.resolve();
  }
  const exact = `${key}:${input.range.since}:${input.range.until}`;
  const active = running.get(exact);
  if (active) return active;
  const promise = fetch("/api/data/refresh-range", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId: input.clientId || undefined, platforms: input.platforms, since: input.range.since, until: input.range.until, force: input.force })
  }).then(async (response) => {
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.results?.some((item: { ok: boolean }) => item.ok)) {
      throw new Error(json?.error || "range_refresh_failed");
    }
    recent.set(key, { ...input.range, at: Date.now() });
    window.dispatchEvent(new CustomEvent("traffic-range-refreshed", { detail: { ...input, results: json.results } }));
    window.dispatchEvent(new Event("traffic-sync-done"));
  }).finally(() => running.delete(exact));
  running.set(exact, promise);
  return promise;
}

export function useFreshDataRange(input: { clientId?: string; platforms: Platform[]; range: Range; enabled?: boolean }) {
  const platforms = input.platforms.join(",");
  useEffect(() => {
    if (input.enabled === false || !input.range.since || !input.range.until) return;
    void requestFreshDataRange({ clientId: input.clientId, platforms: input.platforms, range: input.range }).catch(() => {});
  }, [input.clientId, input.range.since, input.range.until, input.enabled, platforms]);
}
