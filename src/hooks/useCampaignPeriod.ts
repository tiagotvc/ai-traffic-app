"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { type PeriodState } from "@/components/PeriodFilter";
import { periodStateFromQueryString } from "@/lib/campaign-period-url";
import { parsePeriodFromSearchParams, periodToSearchParams } from "@/lib/report-period";

function periodStateFromParsed(p: ReturnType<typeof parsePeriodFromSearchParams>): PeriodState {
  return {
    preset: p.preset,
    since: p.since ?? "",
    until: p.until ?? ""
  };
}

export { periodStateFromQueryString, buildPeriodQueryFromParams } from "@/lib/campaign-period-url";

export function useCampaignPeriod() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const period = useMemo(() => {
    const url = new URL("http://local");
    searchParams.forEach((v, k) => url.searchParams.set(k, v));
    return periodStateFromParsed(parsePeriodFromSearchParams(url));
  }, [searchParams]);

  const periodQueryString = useMemo(() => {
    const qs = periodToSearchParams(period).toString();
    return qs ? `?${qs}` : "";
  }, [period]);

  const setPeriod = useCallback(
    (next: PeriodState) => {
      const params = new URLSearchParams(searchParams.toString());
      const periodQs = periodToSearchParams({
        preset: next.preset,
        since: next.since,
        until: next.until
      });
      for (const key of ["period", "since", "until", "days"]) {
        params.delete(key);
      }
      periodQs.forEach((v, k) => params.set(k, v));
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams]
  );

  return { period, setPeriod, periodQueryString };
}
