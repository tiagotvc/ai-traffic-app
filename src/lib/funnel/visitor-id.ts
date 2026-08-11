import "server-only";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";

const VISITOR_COOKIE = "visitor_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Lê o cookie de visitante do funil; se não existir, gera um novo e já grava. */
export async function getOrSetVisitorId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(VISITOR_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  jar.set(VISITOR_COOKIE, id, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ONE_YEAR_SECONDS,
    path: "/"
  });
  return id;
}
