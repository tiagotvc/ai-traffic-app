import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";

export async function GET() {
  const { user } = await getAppContext();
  return NextResponse.json({
    ok: true,
    account: {
      email: user.email,
      name: user.name,
      hasPassword: Boolean(user.passwordHash),
      hasGoogle: Boolean(user.googleId),
      hasFacebook: Boolean(user.facebookId)
    }
  });
}
