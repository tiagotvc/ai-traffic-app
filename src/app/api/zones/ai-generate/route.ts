import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import { assertCreativeMemoryAiAccess } from "@/lib/creative-memory/ai-usage";
import { classifyLlmError } from "@/lib/llm/generate-json";
import { getApiKeyForProvider, getLlmProvidersStatus } from "@/lib/llm/keys";
import type { LlmProviderId } from "@/lib/llm/types";
import { createUserZone } from "@/lib/user-persona-zone";
import {
  generateZoneAiPreview,
  generateZoneFromPrompt,
  geocodeZonePreview
} from "@/lib/zone-targeting-ai";

const PreviewSchema = z.object({
  phase: z.literal("preview"),
  prompt: z.string().min(3).max(500),
  provider: z.enum(["gemini", "claude"]).default("gemini")
});

const GeocodeSchema = z.object({
  phase: z.literal("geocode"),
  prompt: z.string().min(3).max(500),
  provider: z.enum(["gemini", "claude"]).default("gemini"),
  preview: z.object({
    zoneName: z.string(),
    summary: z.string(),
    places: z.array(
      z.object({
        label: z.string(),
        city: z.string().optional(),
        state: z.string().optional(),
        radiusKm: z.number().optional()
      })
    ),
    provider: z.enum(["gemini", "claude"]).optional(),
    modelUsed: z.string().optional()
  })
});

const SaveSchema = z.object({
  phase: z.literal("save"),
  name: z.string().min(1),
  description: z.string().optional(),
  geoRules: z.record(z.string(), z.unknown()),
  sourcePrompt: z.string().optional()
});

const BuildSchema = z.object({
  phase: z.literal("build"),
  prompt: z.string().min(3).max(500),
  provider: z.enum(["gemini", "claude"]).default("gemini")
});

const BodySchema = z.discriminatedUnion("phase", [
  PreviewSchema,
  GeocodeSchema,
  SaveSchema,
  BuildSchema
]);

export async function GET() {
  return NextResponse.json({ ok: true, providers: getLlmProvidersStatus() });
}

export async function POST(req: Request) {
  const { tenant, user } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const body = BodySchema.parse(await req.json().catch(() => ({})));

  if (body.phase === "save") {
    const zone = await createUserZone({
      tenantId: tenant.id,
      userId: user.id,
      name: body.name,
      description: body.description,
      geoRules: body.geoRules as import("@/db/entities/UserZone").ZoneGeoRules,
      sourcePrompt: body.sourcePrompt
    });
    return NextResponse.json({ ok: true, zone });
  }

  const provider = body.provider as LlmProviderId;
  if (!getApiKeyForProvider(provider)) {
    return NextResponse.json({ ok: false, error: "IA não configurada" }, { status: 503 });
  }

  try {
    await assertCreativeMemoryAiAccess(tenant.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Limite de IA atingido";
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }

  try {
    if (body.phase === "preview") {
      const preview = await generateZoneAiPreview({ provider, prompt: body.prompt });
      return NextResponse.json({ ok: true, preview });
    }

    if (body.phase === "geocode") {
      const result = await geocodeZonePreview({
        zoneName: body.preview.zoneName,
        summary: body.preview.summary,
        places: body.preview.places.map((p) => ({
          label: p.label,
          city: p.city,
          state: p.state,
          radiusKm: p.radiusKm ?? 3
        })),
        provider: body.preview.provider ?? provider,
        modelUsed: body.preview.modelUsed ?? ""
      });
      return NextResponse.json({ ok: true, result });
    }

    const result = await generateZoneFromPrompt({ provider, prompt: body.prompt });
    const zone = await createUserZone({
      tenantId: tenant.id,
      userId: user.id,
      name: result.name,
      description: result.summary,
      geoRules: result.geoRules,
      sourcePrompt: body.prompt
    });

    return NextResponse.json({ ok: true, zone, result });
  } catch (e) {
    const classified = classifyLlmError(e);
    return NextResponse.json({ ok: false, error: classified.message }, { status: 502 });
  }
}
