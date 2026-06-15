import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getPlatformUserDetail,
  updatePlatformUser
} from "@/lib/admin/platform-users";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

const patchSchema = z.object({
  name: z.string().max(120).nullable().optional(),
  email: z.string().email().optional(),
  platformRole: z.enum(["user", "admin"]).optional()
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const { userId } = await params;
  const detail = await getPlatformUserDetail(userId);
  if (!detail) {
    return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, ...detail });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  try {
    const { userId } = await params;
    const body = patchSchema.parse(await req.json());
    const detail = await updatePlatformUser(userId, body);
    if (!detail) {
      return NextResponse.json({ ok: false, error: "Usuário não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, ...detail });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
