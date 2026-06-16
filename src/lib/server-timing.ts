/** Helpers para header Server-Timing (benchmark / DevTools). */

export type TimingParts = Record<string, number>;

export function buildServerTiming(parts: TimingParts): string {
  return Object.entries(parts)
    .filter(([, ms]) => ms >= 0 && Number.isFinite(ms))
    .map(([name, ms]) => `${name};dur=${Math.round(ms)}`)
    .join(", ");
}

export function applyServerTiming(res: Response, parts: TimingParts): Response {
  const header = buildServerTiming(parts);
  if (header) res.headers.set("Server-Timing", header);
  return res;
}

export function jsonWithTiming<T extends Record<string, unknown>>(
  body: T,
  parts: TimingParts,
  init?: ResponseInit
): Response {
  const res = Response.json(body, init);
  return applyServerTiming(res, parts);
}
