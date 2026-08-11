import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext, getClientBySlugOrId } from "@/lib/app-context";
import { billingErrorResponse } from "@/lib/billing/api-errors";
import {
  aiCreditsErrorResponse,
  assertCreativeMemoryAiAccess,
  getCreativeMemoryAiStatus,
  recordCreativeMemoryAiUsage
} from "@/lib/creative-memory/ai-usage";
import { DEFAULT_AI_CREDIT_WEIGHTS } from "@/lib/ai-credits/defaults";
import {
  CREATIVE_STUDIO_FORMATS,
  CREATIVE_STUDIO_STYLES,
  generateCreativeStudioBatch,
  type CreativeStudioInsight,
  type CreativeStudioVariant
} from "@/lib/creative-studio/generate";
import { extractPageSummary } from "@/lib/creative-studio/extract-url";
import { saveGeneratedVariants } from "@/lib/creative-studio/library";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const BodySchema = z
  .object({
    clientSlug: z.string().min(1),
    description: z.string().min(4).max(500).optional(),
    sourceUrl: z.string().url().optional(),
    format: z.enum(CREATIVE_STUDIO_FORMATS),
    style: z.enum(CREATIVE_STUDIO_STYLES),
    // Ausente = lote completo (4). count:1 é o "gerar variação parecida" de um card só.
    count: z.number().int().min(1).max(4).optional()
  })
  .refine((b) => Boolean(b.description?.trim() || b.sourceUrl), {
    message: "Descreva a oferta ou cole um link."
  });

type CreditsInfo = { used: number; remaining: number; limit: number } | null;

/**
 * Nunca deixa o nome de um provedor de infra (Cloudflare, Gemini, "neurons", status HTTP
 * cru...) chegar no usuário — mesma regra do Commander, que nunca expõe qual IA responde.
 * O detalhe real sempre vai pro `console.error`, o usuário só vê algo acionável.
 */
function userFacingGenerateError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  if (/neurons|cloudflare|workers ai/i.test(raw)) {
    return "Você atingiu o limite de gerações de imagem por hoje — tenta de novo mais tarde.";
  }
  if (/gemini|anthropic|claude/i.test(raw)) {
    return "A IA está indisponível no momento — tenta de novo em instantes.";
  }
  if (err instanceof z.ZodError) {
    return `Dados inválidos: ${err.issues.map((i) => i.message).join("; ")}`;
  }
  if (raw === "Descreva a oferta ou cole um link." || raw === "Cliente não encontrado") {
    return raw;
  }
  return "Não foi possível gerar os criativos agora. Tenta de novo em instantes.";
}

type StreamEvent =
  | { phase: "status"; label: string }
  | { phase: "variant"; variant: CreativeStudioVariant; index: number; total: number }
  | {
      phase: "done";
      variants: CreativeStudioVariant[];
      insight: CreativeStudioInsight | null;
      credits: CreditsInfo;
    }
  | { phase: "error"; error: string };

/**
 * SSE — mesmo padrão de `/api/commander/ask`: progresso real (não decorativo) emitido
 * conforme o servidor realmente compõe copy + cada imagem, em vez de um spinner cego
 * pelos ~30-50s que o lote inteiro leva.
 */
export async function POST(req: Request) {
  // Tudo antes de abrir o stream (auth, parse, gate de crédito) tem que virar
  // NextResponse.json limpo em qualquer falha — uma exceção não capturada aqui vira
  // resposta malformada em dev (JSON válido + overlay anexado), que quebra o parse no
  // client com uma mensagem ilegível em vez do erro real.
  let tenant: Awaited<ReturnType<typeof getAppContext>>["tenant"];
  let user: Awaited<ReturnType<typeof getAppContext>>["user"];
  let body: z.infer<typeof BodySchema>;
  let client: NonNullable<Awaited<ReturnType<typeof getClientBySlugOrId>>>;
  try {
    ({ tenant, user } = await getAppContext());
    body = BodySchema.parse(await req.json().catch(() => ({})));

    const found = await getClientBySlugOrId(tenant.id, body.clientSlug);
    if (!found) {
      return NextResponse.json({ ok: false, error: "Cliente não encontrado" }, { status: 404 });
    }
    client = found;

    await assertCreativeMemoryAiAccess(tenant.id, client.id, "creative_studio_generate");
  } catch (err) {
    const creditsRes = aiCreditsErrorResponse(err);
    if (creditsRes) return creditsRes;
    const res = billingErrorResponse(err);
    if (res) return res;
    console.error("[creative-studio generate] pre-stream", err);
    return NextResponse.json({ ok: false, error: userFacingGenerateError(err) }, { status: 500 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: StreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          /* stream fechado */
        }
      };

      try {
        let description = body.description?.trim() ?? "";
        if (body.sourceUrl) {
          send({ phase: "status", label: "Lendo o link…" });
          const page = await extractPageSummary(body.sourceUrl);
          description = [page.title, page.description].filter(Boolean).join(" — ");
          if (!description) {
            throw new Error("Não consegui extrair contexto suficiente desse link.");
          }
        }

        const result = await generateCreativeStudioBatch({
          tenantId: tenant.id,
          clientId: client.id,
          clientName: client.name,
          description,
          format: body.format,
          style: body.style,
          count: body.count,
          emit: (label) => send({ phase: "status", label }),
          onVariant: (variant, index, total) => send({ phase: "variant", variant, index, total })
        });

        await recordCreativeMemoryAiUsage({
          tenantId: tenant.id,
          clientId: client.id,
          kind: "creative_studio_generate",
          createdCount: result.variants.length,
          modelMeta: result.modelMeta,
          content: { question: description }
        });

        try {
          await saveGeneratedVariants({
            tenantId: tenant.id,
            clientId: client.id,
            createdByUserId: user.id,
            format: body.format,
            style: body.style,
            variants: result.variants
          });
        } catch (err) {
          // Histórico é best-effort — nunca derruba a resposta da geração em si.
          console.error("[creative-studio generate] saveGeneratedVariants", err);
        }

        let credits: CreditsInfo = null;
        try {
          const status = await getCreativeMemoryAiStatus(tenant.id);
          credits = {
            used: DEFAULT_AI_CREDIT_WEIGHTS.creative_studio_generate,
            remaining: Number.isFinite(status.usage.remaining) ? status.usage.remaining : -1,
            limit: status.usage.maxAiRequestsPerMonth
          };
        } catch {
          /* uso/créditos são só telemetria de UI — nunca derruba a resposta */
        }

        send({ phase: "done", variants: result.variants, insight: result.insight, credits });
      } catch (err) {
        console.error("[creative-studio generate]", err);
        send({ phase: "error", error: userFacingGenerateError(err) });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
