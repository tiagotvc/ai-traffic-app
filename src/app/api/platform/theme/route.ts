import { NextResponse } from "next/server";

import { getDesignSystemThemeConfig } from "@/lib/design-system/theme-settings";

export async function GET() {
  const config = await getDesignSystemThemeConfig();
  return NextResponse.json(
    { ok: true, config },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120"
      }
    }
  );
}
