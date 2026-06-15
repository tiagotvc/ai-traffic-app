import "server-only";

import { auth } from "@/auth";
import { repositories } from "@/db/repositories";
import { NextResponse } from "next/server";

export type PlatformRole = "user" | "admin";

export function isBillingAdminEmail(email: string): boolean {
  const list = (process.env.BILLING_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function getPlatformRole(userId: string): Promise<PlatformRole> {
  const { user: userRepo } = await repositories();
  const user = await userRepo.findOne({ where: { id: userId } });
  if (user?.platformRole === "admin") return "admin";
  if (user?.email && isBillingAdminEmail(user.email)) return "admin";
  return "user";
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  return (await getPlatformRole(userId)) === "admin";
}

export async function isPlatformAdminByEmail(email: string): Promise<boolean> {
  const { user: userRepo } = await repositories();
  const user = await userRepo.findOne({ where: { email: email.toLowerCase() } });
  if (user && (await isPlatformAdmin(user.id))) return true;
  return isBillingAdminEmail(email);
}

export async function requirePlatformAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionUserId = (session as any)?.user?.id as string | undefined;

  if (!email) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
  }

  if (isBillingAdminEmail(email)) {
    return { ok: true as const, userId: sessionUserId, email };
  }

  const { user: userRepo } = await repositories();
  const user =
    (sessionUserId ? await userRepo.findOne({ where: { id: sessionUserId } }) : null) ??
    (await userRepo.findOne({ where: { email } }));

  if (user?.platformRole === "admin") {
    return { ok: true as const, userId: user.id, email };
  }

  return { ok: false as const, response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
}
