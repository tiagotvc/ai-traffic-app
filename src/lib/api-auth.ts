import "server-only";

import { NextResponse } from "next/server";

import { getAppShellContext } from "@/lib/app-shell-context";
import { SubscriptionSuspendedError } from "@/lib/billing/entitlements";

export class ApiUnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "ApiUnauthorizedError";
  }
}

export class ApiForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ApiForbiddenError";
  }
}

export async function requireAppShellContext() {
  try {
    return await getAppShellContext();
  } catch (err) {
    if (err instanceof Error && err.message === "Not authenticated") {
      throw new ApiUnauthorizedError();
    }
    throw err;
  }
}

export function apiErrorResponse(err: unknown, label: string) {
  if (err instanceof ApiUnauthorizedError) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (err instanceof SubscriptionSuspendedError) {
    return NextResponse.json({ ok: false, error: "Account suspended" }, { status: 403 });
  }
  // eslint-disable-next-line no-console
  console.error(`[${label}]`, err);
  return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
}
