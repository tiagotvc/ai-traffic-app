import { NextResponse } from "next/server";

import { isPlatformFeatureEnabled } from "@/lib/feature-flags/service";

/** Flags do módulo de relatórios para o client (v1 clássico × v2 IA × v3 entrega). */
export async function GET() {
  const [v1, v2, v3, emailPdf, emailLink, whatsapp] = await Promise.all([
    isPlatformFeatureEnabled("reports.v1"),
    isPlatformFeatureEnabled("reports.v2"),
    isPlatformFeatureEnabled("reports.v3"),
    isPlatformFeatureEnabled("reports.v3.emailPdf"),
    isPlatformFeatureEnabled("reports.v3.emailLink"),
    isPlatformFeatureEnabled("reports.v3.whatsapp")
  ]);
  return NextResponse.json({
    ok: true,
    v1,
    v2,
    v3,
    channels: { email_pdf: emailPdf, email_link: emailLink, whatsapp }
  });
}
