import "server-only";

import { In, MoreThanOrEqual, Not } from "typeorm";

import { repositories } from "@/db/repositories";

const DEDUPE_WINDOW_DAYS = 30;

/** Checagem cross-tabela: learning ou hipótese ativa com a mesma chave de sinal. */
export async function hasActiveSignalDedupe(
  tenantId: string,
  clientId: string,
  dedupeKey: string
): Promise<{ learning: boolean; hypothesis: boolean }> {
  const since = new Date();
  since.setDate(since.getDate() - DEDUPE_WINDOW_DAYS);
  const { clientLearning: learningRepo, clientHypothesis: hypothesisRepo } = await repositories();

  const [learning, hypothesis] = await Promise.all([
    learningRepo.findOne({
      where: {
        tenantId,
        clientId,
        dedupeKey,
        status: Not(In(["ARCHIVED", "REJECTED"])),
        createdAt: MoreThanOrEqual(since)
      }
    }),
    hypothesisRepo.findOne({
      where: {
        tenantId,
        clientId,
        dedupeKey,
        status: Not(In(["REJECTED", "PROMOTED"])),
        createdAt: MoreThanOrEqual(since)
      }
    })
  ]);

  return { learning: !!learning, hypothesis: !!hypothesis };
}
