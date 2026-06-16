import "server-only";

import type { ClientDna } from "@/db/entities/ClientDna";
import type { LearningCategory } from "@/db/entities/ClientLearning";
import { repositories } from "@/db/repositories";
import type { ClientDnaPayload, DnaBucket } from "@/lib/agency-brain/domain/schemas";
import { listApprovedLearnings } from "@/lib/agency-brain/client-learning-service";

const emptyBucket = (): DnaBucket => ({ works: [], doesntWork: [] });

const CATEGORY_TO_BUCKET: Partial<Record<LearningCategory, keyof ClientDnaPayload>> = {
  CREATIVE: "creatives",
  AUDIENCE: "audiences",
  OFFER: "offers",
  COPY: "copy",
  LANDING_PAGE: "placements",
  SEASONALITY: "seasonality"
};

function isNegativeLearning(tags: string[], evidence: Record<string, unknown> | null): boolean {
  if (tags.includes("negative")) return true;
  const ruleId = evidence?.ruleId;
  return ruleId === "spend_no_conversion" || ruleId === "hypothesis_spend_warning";
}

function learningToBullet(title: string, description: string): string {
  const clean = title.replace(/^Hipótese:\s*/i, "").replace(/\.$/, "");
  return description.length > 20 ? `${clean}: ${description.slice(0, 120)}` : clean;
}

function buildBucketsFromLearnings(
  learnings: Awaited<ReturnType<typeof listApprovedLearnings>>
): Pick<
  ClientDnaPayload,
  "audiences" | "creatives" | "placements" | "offers" | "copy" | "seasonality"
> {
  const buckets = {
    audiences: emptyBucket(),
    creatives: emptyBucket(),
    placements: emptyBucket(),
    offers: emptyBucket(),
    copy: emptyBucket(),
    seasonality: emptyBucket()
  };

  for (const learning of learnings) {
    const bucketKey = CATEGORY_TO_BUCKET[learning.category];
    if (!bucketKey || bucketKey === "summaryText" || bucketKey === "lastDerivedAt") continue;

    const bucket = buckets[bucketKey as keyof typeof buckets];
    const bullet = learningToBullet(learning.title, learning.description);
    const negative = isNegativeLearning(learning.tags ?? [], learning.evidence);

    const target = negative ? bucket.doesntWork : bucket.works;
    if (!target.includes(bullet)) {
      target.push(bullet);
    }
  }

  for (const key of Object.keys(buckets) as Array<keyof typeof buckets>) {
    buckets[key].works = buckets[key].works.slice(0, 12);
    buckets[key].doesntWork = buckets[key].doesntWork.slice(0, 12);
  }

  return buckets;
}

function buildDnaSummary(learnings: Awaited<ReturnType<typeof listApprovedLearnings>>): string {
  if (!learnings.length) {
    return "DNA ainda não derivado — aprove aprendizados para construir o perfil do cliente.";
  }

  const works = learnings.filter((l) => !isNegativeLearning(l.tags ?? [], l.evidence)).slice(0, 3);
  const avoid = learnings.filter((l) => isNegativeLearning(l.tags ?? [], l.evidence)).slice(0, 2);

  const parts: string[] = [];
  if (works.length) {
    parts.push(`Funciona: ${works.map((l) => l.title.replace(/\.$/, "")).join("; ")}.`);
  }
  if (avoid.length) {
    parts.push(`Evitar: ${avoid.map((l) => l.title.replace(/\.$/, "")).join("; ")}.`);
  }

  return parts.join(" ") || "Perfil derivado de aprendizados aprovados.";
}

export function toClientDnaPayload(row: ClientDna): ClientDnaPayload {
  return {
    audiences: row.audiences,
    creatives: row.creatives,
    placements: row.placements,
    offers: row.offers,
    copy: row.copy,
    seasonality: row.seasonality,
    summaryText: row.summaryText,
    lastDerivedAt: row.lastDerivedAt?.toISOString() ?? null,
    manualOverrides: row.manualOverrides ?? {},
    approvedLearningCount: row.approvedLearningCount
  };
}

export async function getClientDna(
  tenantId: string,
  clientId: string
): Promise<ClientDnaPayload | null> {
  const { clientDna: repo } = await repositories();
  const row = await repo.findOne({ where: { tenantId, clientId } });
  return row ? toClientDnaPayload(row) : null;
}

export async function rebuildClientDna(
  tenantId: string,
  clientId: string
): Promise<ClientDnaPayload> {
  const { clientDna: repo } = await repositories();
  const learnings = await listApprovedLearnings(tenantId, clientId, 200);
  const buckets = buildBucketsFromLearnings(learnings);
  const summaryText = buildDnaSummary(learnings);

  let row = await repo.findOne({ where: { tenantId, clientId } });
  if (!row) {
    row = repo.create({ tenantId, clientId });
  }

  row.audiences = buckets.audiences;
  row.creatives = buckets.creatives;
  row.placements = buckets.placements;
  row.offers = buckets.offers;
  row.copy = buckets.copy;
  row.seasonality = buckets.seasonality;
  row.summaryText = summaryText;
  row.lastDerivedAt = new Date();
  row.approvedLearningCount = learnings.length;

  const saved = await repo.save(row);
  return toClientDnaPayload(saved);
}

export type PatchClientDnaInput = Partial<
  Pick<
    ClientDnaPayload,
    "audiences" | "creatives" | "placements" | "offers" | "copy" | "seasonality" | "summaryText" | "manualOverrides"
  >
>;

export async function patchClientDna(
  tenantId: string,
  clientId: string,
  input: PatchClientDnaInput
): Promise<ClientDnaPayload> {
  const { clientDna: repo } = await repositories();
  let row = await repo.findOne({ where: { tenantId, clientId } });

  if (!row) {
    row = repo.create({ tenantId, clientId });
  }

  if (input.audiences !== undefined) row.audiences = input.audiences;
  if (input.creatives !== undefined) row.creatives = input.creatives;
  if (input.placements !== undefined) row.placements = input.placements;
  if (input.offers !== undefined) row.offers = input.offers;
  if (input.copy !== undefined) row.copy = input.copy;
  if (input.seasonality !== undefined) row.seasonality = input.seasonality;
  if (input.summaryText !== undefined) row.summaryText = input.summaryText;
  if (input.manualOverrides !== undefined) {
    row.manualOverrides = { ...row.manualOverrides, ...input.manualOverrides };
  }

  const saved = await repo.save(row);
  return toClientDnaPayload(saved);
}
