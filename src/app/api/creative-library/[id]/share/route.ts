import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { shareLibraryItem } from "@/lib/creative-studio/library";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { tenant } = await getAppContext();
    const ok = await shareLibraryItem(tenant.id, id);
    if (!ok) return NextResponse.json({ ok: false, error: "Item não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[creative-library share]", err);
    return NextResponse.json({ ok: false, error: "Não foi possível compartilhar agora." }, { status: 500 });
  }
}
