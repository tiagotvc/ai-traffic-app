import "server-only";

import type { NextResponse } from "next/server";

import { billingErrorResponse } from "@/lib/billing/api-errors";

import { aiCreditsErrorResponse, assertAiCreditsAccess } from "./credits-service";
import type { AiCreditKind } from "./types";

export type ChargeOrRespondResult =
  | { ok: true; creditsCharged: number }
  | { ok: false; response: NextResponse };

/**
 * Encapsula o padrão repetido `assertAiCreditsAccess` → `billingErrorResponse`/`aiCreditsErrorResponse`
 * que cada rota gated fazia inline — usar nas rotas de criação (campanha/persona/zona/criativo) e
 * nas de análise por IA em vez de copiar o try/catch em cada arquivo.
 */
export async function chargeOrRespond(args: {
  tenantId: string;
  clientId?: string | null;
  kind: AiCreditKind;
  /** When false, only checks plan feature flags (legacy path) — ações não-IA usam false. */
  requireCreativeMemory?: boolean;
}): Promise<ChargeOrRespondResult> {
  try {
    const access = await assertAiCreditsAccess(args);
    return { ok: true, creditsCharged: access.creditsCharged };
  } catch (err) {
    const response = billingErrorResponse(err) ?? aiCreditsErrorResponse(err);
    if (response) return { ok: false, response };
    throw err;
  }
}
