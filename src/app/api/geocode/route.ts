import { NextResponse } from "next/server";

import { geocodeWithNominatim } from "@/lib/geocode-nominatim";

/** Lightweight geocode for campaign targeting map fly-to (city/region/country search). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ ok: false, error: "q é obrigatório" }, { status: 400 });
  }

  try {
    const hit = await geocodeWithNominatim(q, { countrycodes: "br" });
    if (!hit) {
      return NextResponse.json({ ok: false, error: "Local não encontrado" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      latitude: hit.latitude,
      longitude: hit.longitude,
      displayName: hit.displayName
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha no geocode";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
