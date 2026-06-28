import "server-only";

import crypto from "node:crypto";

import type { MetricKey } from "@/lib/dashboard-metrics";
import type { PeriodPreset } from "@/lib/report-period";
import { getAuthSecret } from "@/lib/auth-secret";

export type ReportPrintTokenPayload = {
  tenantId: string;
  clientParam: string;
  adAccountId?: string;
  reportType: "simple" | "complete";
  locale: string;
  goalLabel: string;
  preset: PeriodPreset;
  since?: string;
  until?: string;
  selectedMetrics?: MetricKey[];
  exp: number;
};

const TTL_MS = 5 * 60_000;

function sign(data: string): string {
  return crypto.createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
}

export function createReportPrintToken(
  input: Omit<ReportPrintTokenPayload, "exp">,
  ttlMs: number = TTL_MS
): string {
  const payload: ReportPrintTokenPayload = { ...input, exp: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifyReportPrintToken(token: string): ReportPrintTokenPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = sign(body);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as ReportPrintTokenPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    if (!payload.tenantId || !payload.clientParam) return null;
    return payload;
  } catch {
    return null;
  }
}
