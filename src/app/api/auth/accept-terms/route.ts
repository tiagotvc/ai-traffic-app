import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { repositories } from "@/db/repositories";
import { LEGAL_CONTACT } from "@/lib/marketing/legal-contact";

async function currentUser() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  const { user: userRepo } = await repositories();
  return userRepo.findOne({ where: { email } });
}

/** Status do aceite dos termos do usuário logado. */
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false, accepted: true }, { status: 401 });
    const accepted =
      !!user.termsAcceptedAt && user.termsAcceptedVersion === LEGAL_CONTACT.termsVersion;
    return NextResponse.json({ ok: true, accepted });
  } catch {
    // Em caso de falha (ex.: coluna ainda não migrada), não bloqueia o app.
    return NextResponse.json({ ok: true, accepted: true });
  }
}

/** Registra o aceite dos termos pelo usuário logado. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const { user: userRepo } = await repositories();
  user.termsAcceptedAt = new Date();
  user.termsAcceptedVersion = LEGAL_CONTACT.termsVersion;
  await userRepo.save(user);
  return NextResponse.json({ ok: true });
}
