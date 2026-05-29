import { NextResponse } from "next/server";

import { signOut } from "@/auth";
import { repositories } from "@/db/repositories";
import { getAppContext } from "@/lib/app-context";

export async function POST() {
  const { user } = await getAppContext();
  const { notificationState: repo } = await repositories();

  let state = await repo.findOne({ where: { userId: user.id } });
  if (!state) state = repo.create({ userId: user.id });
  state.lastLogoutAt = new Date();
  await repo.save(state);

  await signOut({ redirect: false });
  return NextResponse.json({ ok: true });
}

