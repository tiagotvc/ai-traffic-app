import { NextResponse } from "next/server";

import { repositories } from "@/db/repositories";
import { apiErrorResponse, requireAppShellContext } from "@/lib/api-auth";

export async function POST() {
  try {
    const { user } = await requireAppShellContext();
    const { notificationState: notifRepo } = await repositories();

    let state = await notifRepo.findOne({ where: { userId: user.id } });
    if (!state) state = await notifRepo.save(notifRepo.create({ userId: user.id }));
    state.lastLoginAt = new Date();
    await notifRepo.save(state);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiErrorResponse(err, "api/me/heartbeat");
  }
}
