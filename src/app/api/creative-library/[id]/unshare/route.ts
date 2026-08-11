import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { unshareLibraryItem } from "@/lib/creative-studio/library";
import { assertFeatureEnabled, FeatureDisabledError } from "@/lib/feature-flags/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { tenant } = await getAppContext();
    await assertFeatureEnabled("creative-studio");
    const ok = await unshareLibraryItem(tenant.id, id);
    if (!ok) return NextResponse.json({ ok: false, error: "Item não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof FeatureDisabledError) {
      return NextResponse.json({ ok: false, error: "Recurso desabilitado" }, { status: 403 });
    }
    console.error("[creative-library unshare]", err);
    return NextResponse.json({ ok: false, error: "Não foi possível remover o compartilhamento agora." }, { status: 500 });
  }
}
