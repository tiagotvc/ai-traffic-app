import "server-only";

import { createHash } from "crypto";
import { repositories } from "@/db/repositories";
import { recordFunnelEvent } from "@/lib/funnel/record-event";
import { readVisitorId } from "@/lib/funnel/visitor-id";

export type SignupBlockReason = "honeypot" | "suspicious_name" | "rate_limited" | "captcha_failed";

export function requestIp(headers: Headers): string {
  return headers.get("cf-connecting-ip")?.trim()
    || headers.get("x-real-ip")?.trim()
    || headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

function hash(value: string): string {
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? "signup"}:${value}`).digest("hex");
}

export function looksGeneratedName(name: string): boolean {
  const value = name.trim();
  return value.length >= 16 && /^[A-Za-z]+$/.test(value) && /[a-z]/.test(value) && /[A-Z]/.test(value) && !/\s/.test(value);
}

export async function signupRateLimited(ip: string, email: string): Promise<boolean> {
  const { funnelEvent: repo } = await repositories();
  const ipHash = hash(ip);
  const [ipCount, emailCount] = await Promise.all([
    repo.createQueryBuilder("f").where('f."createdAt" > now() - interval \'1 hour\'')
      .andWhere("f.meta->>'ipHash' = :ipHash", { ipHash }).getCount(),
    repo.createQueryBuilder("f").where('f."createdAt" > now() - interval \'24 hours\'')
      .andWhere("LOWER(f.email) = :email", { email: email.toLowerCase() })
      .andWhere("f.eventType IN (:...types)", { types: ["completed_signup", "blocked_signup"] }).getCount()
  ]);
  return ipCount >= 5 || emailCount >= 3;
}

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body, cache: "no-store"
    });
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

export async function recordBlockedSignup(reason: SignupBlockReason, ip: string, email: string) {
  await recordFunnelEvent({
    visitorId: (await readVisitorId()) ?? `ip:${hash(ip).slice(0, 20)}`,
    eventType: "blocked_signup",
    email: email.slice(0, 320) || null,
    meta: { reason, ipHash: hash(ip), occurredAt: new Date().toISOString() }
  });
}
