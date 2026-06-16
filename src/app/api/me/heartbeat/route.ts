import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { getAppShellContext } from "@/lib/app-shell-context";

export async function POST() {
  const { user } = await getAppShellContext();
  const { notificationState: notifRepo } = await repositories();

  let state = await notifRepo.findOne({ where: { userId: user.id } });
  if (!state) state = await notifRepo.save(notifRepo.create({ userId: user.id }));
  state.lastLoginAt = new Date();
  await notifRepo.save(state);

  return NextResponse.json({ ok: true });
}
