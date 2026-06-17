import { NextResponse } from "next/server";
import { z } from "zod";

import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";
import { hashPassword, verifyPassword } from "@/lib/password";

const PatchSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

export async function PATCH(req: Request) {
  const { user } = await getAppContext();
  if (!user.passwordHash) {
    return NextResponse.json({ ok: false, error: "oauth_only" }, { status: 400 });
  }

  const body = PatchSchema.parse(await req.json().catch(() => ({})));
  const valid = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 400 });
  }

  const { user: userRepo } = await repositories();
  user.passwordHash = await hashPassword(body.newPassword);
  await userRepo.save(user);

  return NextResponse.json({ ok: true });
}
