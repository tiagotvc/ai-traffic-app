const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isoDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve o intervalo de datas de uma request Google Ads. Aceita `?since=&until=`
 * (YYYY-MM-DD) OU `?days=N` (default 30). Devolve since/until (para os helpers GAQL)
 * e days (para consultas por janela, ex.: snapshots).
 */
export function googleRangeFromParams(url: URL): {
  since: string;
  until: string;
  days: number;
} {
  const since = url.searchParams.get("since");
  const until = url.searchParams.get("until");
  if (since && until && ISO_DATE.test(since) && ISO_DATE.test(until) && since <= until) {
    const days = Math.max(
      1,
      Math.round((Date.parse(until) - Date.parse(since)) / 86_400_000) + 1
    );
    return { since, until, days: Math.min(days, 730) };
  }
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);
  return { since: isoDaysAgo(days), until: isoDaysAgo(0), days };
}
