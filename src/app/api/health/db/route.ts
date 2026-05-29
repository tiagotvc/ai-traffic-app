import { NextResponse } from "next/server";

import { getDataSource } from "@/db/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ds = await getDataSource();
    await ds.query("SELECT 1");
    return NextResponse.json({
      ok: true,
      database: "connected",
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL)
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database connection failed";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hint: "Set DATABASE_URL on Vercel to Supabase pooler (port 6543, ?pgbouncer=true). Run pnpm run db:migrate with DIRECT_URL."
      },
      { status: 503 }
    );
  }
}
