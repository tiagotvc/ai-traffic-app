import "server-only";

import { extractPersonaTargetingItems } from "@/lib/audience-targeting-shared";
import { validateTargetingIdList } from "@/lib/meta-graph";
import { resolveFlexBucket } from "@/lib/meta-targeting-flex";
import { pruneInvalidTargetingIds } from "@/lib/meta-targeting-prune";
import { searchReplacementCandidates } from "@/lib/meta-segment-replacement";
import type {
  PersonaSegmentInfo,
  PersonaSegmentReplacement,
  PersonaSegmentType,
  PersonaTargetingIssue,
  PersonaTargetingSummary
} from "@/lib/persona-targeting-types";
import { getUserPersona, updateUserPersona } from "@/lib/user-persona-zone";
import type { UserPersona } from "@/db/entities/UserPersona";

async function findValidReplacement(
  accessToken: string,
  adAccountId: string,
  segment: Pick<PersonaSegmentInfo, "id" | "name" | "type">
): Promise<{ id: string; name: string; type: PersonaSegmentType } | null> {
  const candidates = await searchReplacementCandidates(accessToken, adAccountId, {
    id: segment.id,
    name: segment.name,
    type: segment.type
  });
  return candidates[0] ?? null;
}

function applySegmentReplacements(
  targeting: Record<string, unknown>,
  replacements: PersonaSegmentReplacement[]
): Record<string, unknown> {
  const swap = new Map(
    replacements
      .filter((r) => r.replacement)
      .map((r) => [r.invalidId, r.replacement!])
  );
  if (!swap.size) return targeting;

  const flex = targeting.flexible_spec;
  if (!Array.isArray(flex)) return targeting;

  const nextFlex = flex.map((group) => {
    if (!group || typeof group !== "object") return group;
    const nextGroup: Record<string, Array<{ id: string; name?: string }>> = {};

    for (const [key, value] of Object.entries(group as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        if (!item || typeof item !== "object" || !("id" in item)) continue;
        const id = String((item as { id: unknown }).id);
        const replacement = swap.get(id);
        if (replacement) {
          const bucket = resolveFlexBucket({ itemType: replacement.type });
          const list = nextGroup[bucket] ?? (nextGroup[bucket] = []);
          list.push({ id: replacement.id, name: replacement.name });
        } else {
          const list = nextGroup[key] ?? (nextGroup[key] = []);
          list.push(item as { id: string; name?: string });
        }
      }
    }
    return nextGroup;
  });

  return { ...targeting, flexible_spec: nextFlex };
}

export async function summarizePersonaTargeting(args: {
  persona: UserPersona;
  accessToken: string;
  adAccountId: string;
}): Promise<PersonaTargetingSummary | null> {
  const rawSegments = extractPersonaTargetingItems(args.persona.targeting);
  if (!rawSegments.length) return null;

  const validation = await validateTargetingIdList(
    args.accessToken,
    args.adAccountId,
    rawSegments.map((s) => s.id)
  );
  const metaById = new Map(validation.map((row) => [row.id, row]));

  const segments: PersonaSegmentInfo[] = rawSegments.map((seg) => {
    const meta = metaById.get(seg.id);
    const officialName = meta?.name?.trim();
    const storedName = seg.name?.trim();
    const looksLikeId = !storedName || storedName === seg.id || /^\d+$/.test(storedName);
    return {
      id: seg.id,
      name: officialName || (looksLikeId ? seg.id : storedName),
      type: seg.type,
      valid: meta?.valid !== false
    };
  });

  return {
    personaId: args.persona.id,
    personaName: args.persona.name,
    valid: segments.every((s) => s.valid),
    segments
  };
}

export async function auditPersonaTargeting(args: {
  persona: UserPersona;
  accessToken: string;
  adAccountId: string;
  findReplacements?: boolean;
}): Promise<PersonaTargetingIssue | null> {
  const { persona, accessToken, adAccountId } = args;
  const rawSegments = extractPersonaTargetingItems(persona.targeting);
  if (!rawSegments.length) return null;

  const validation = await validateTargetingIdList(
    accessToken,
    adAccountId,
    rawSegments.map((s) => s.id)
  );
  const metaById = new Map(validation.map((row) => [row.id, row]));

  const segments: PersonaSegmentInfo[] = rawSegments.map((seg) => {
    const meta = metaById.get(seg.id);
    const valid = meta?.valid !== false;
    const officialName = meta?.name?.trim();
    const storedName = seg.name?.trim();
    const looksLikeId = !storedName || storedName === seg.id || /^\d+$/.test(storedName);
    return {
      id: seg.id,
      name: officialName || (looksLikeId ? seg.id : storedName),
      type: seg.type,
      valid
    };
  });

  const invalidSegments = segments.filter((s) => !s.valid);
  if (!invalidSegments.length) return null;

  const replacements: PersonaSegmentReplacement[] = [];
  if (args.findReplacements) {
    for (const seg of invalidSegments) {
      const replacement = await findValidReplacement(accessToken, adAccountId, seg);
      replacements.push({
        invalidId: seg.id,
        invalidName: seg.name,
        replacement
      });
    }
  }

  return {
    personaId: persona.id,
    personaName: persona.name,
    description: persona.description,
    sourcePrompt: persona.sourcePrompt,
    ageMin: persona.ageMin,
    ageMax: persona.ageMax,
    gender: persona.gender,
    segments,
    invalidSegments,
    validSegments: segments.filter((s) => s.valid),
    replacements,
    allSegmentsInvalid: invalidSegments.length >= segments.length
  };
}

export async function inspectPersonasTargeting(args: {
  tenantId: string;
  userId: string;
  accessToken: string;
  adAccountId: string;
  personaIds: string[];
  findReplacements?: boolean;
}): Promise<PersonaTargetingIssue[]> {
  const issues: PersonaTargetingIssue[] = [];
  const uniqueIds = [...new Set(args.personaIds.filter(Boolean))];

  for (const personaId of uniqueIds) {
    const persona = await getUserPersona({
      tenantId: args.tenantId,
      userId: args.userId,
      id: personaId
    });
    if (!persona) continue;

    let audit = await auditPersonaTargeting({
      persona,
      accessToken: args.accessToken,
      adAccountId: args.adAccountId,
      findReplacements: args.findReplacements
    });

    if (!audit) {
      const { removed } = await pruneInvalidTargetingIds(
        persona.targeting,
        args.accessToken,
        args.adAccountId
      );
      if (!removed.length) continue;

      audit = await auditPersonaTargeting({
        persona,
        accessToken: args.accessToken,
        adAccountId: args.adAccountId,
        findReplacements: args.findReplacements
      });
      if (!audit) {
        const segments = extractPersonaTargetingItems(persona.targeting);
        const invalidSegments: PersonaSegmentInfo[] = removed.map((row) => {
          const seg = segments.find((s) => s.id === row.id);
          return {
            id: row.id,
            name: row.name ?? seg?.name ?? row.id,
            type: seg?.type ?? "interest",
            valid: false
          };
        });
        issues.push({
          personaId: persona.id,
          personaName: persona.name,
          description: persona.description,
          sourcePrompt: persona.sourcePrompt,
          ageMin: persona.ageMin,
          ageMax: persona.ageMax,
          gender: persona.gender,
          segments: segments.map((s) => ({
            id: s.id,
            name: s.name,
            type: s.type,
            valid: !invalidSegments.some((i) => i.id === s.id)
          })),
          invalidSegments,
          validSegments: segments
            .filter((s) => !invalidSegments.some((i) => i.id === s.id))
            .map((s) => ({ ...s, valid: true })),
          replacements: [],
          allSegmentsInvalid: invalidSegments.length >= segments.length
        });
        continue;
      }
    }

    issues.push(audit);
  }

  return issues;
}

export async function summarizePersonasTargeting(args: {
  tenantId: string;
  userId: string;
  accessToken: string;
  adAccountId: string;
  personaIds: string[];
}): Promise<PersonaTargetingSummary[]> {
  const summaries: PersonaTargetingSummary[] = [];
  const uniqueIds = [...new Set(args.personaIds.filter(Boolean))];

  for (const personaId of uniqueIds) {
    const persona = await getUserPersona({
      tenantId: args.tenantId,
      userId: args.userId,
      id: personaId
    });
    if (!persona) continue;
    const summary = await summarizePersonaTargeting({
      persona,
      accessToken: args.accessToken,
      adAccountId: args.adAccountId
    });
    if (summary) summaries.push(summary);
  }

  return summaries;
}

export async function autoFixPersonasTargeting(args: {
  tenantId: string;
  userId: string;
  accessToken: string;
  adAccountId: string;
  personaIds: string[];
  tryReplace?: boolean;
}): Promise<{ fixedPersonaIds: string[]; skipped: PersonaTargetingIssue[] }> {
  const issues = await inspectPersonasTargeting({
    ...args,
    findReplacements: args.tryReplace ?? true
  });
  const fixedPersonaIds: string[] = [];
  const skipped: PersonaTargetingIssue[] = [];

  for (const issue of issues) {
    const persona = await getUserPersona({
      tenantId: args.tenantId,
      userId: args.userId,
      id: issue.personaId
    });
    if (!persona) continue;

    let targeting = { ...persona.targeting };

    if (args.tryReplace !== false && issue.replacements.some((r) => r.replacement)) {
      targeting = applySegmentReplacements(targeting, issue.replacements);
    }

    const { targeting: pruned, removed } = await pruneInvalidTargetingIds(
      targeting,
      args.accessToken,
      args.adAccountId
    );
    targeting = pruned;

    const remaining = extractPersonaTargetingItems(targeting);
    if (!remaining.length) {
      skipped.push(issue);
      continue;
    }

    if (removed.length === 0 && issue.replacements.every((r) => !r.replacement)) {
      skipped.push(issue);
      continue;
    }

    await updateUserPersona(persona, { targeting });
    fixedPersonaIds.push(persona.id);
  }

  return { fixedPersonaIds, skipped };
}

export function isPersonaTargetingPublishError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("1487694") ||
    msg.includes("não está mais disponível") ||
    msg.includes("no longer available") ||
    msg.includes("descontinuou todos") ||
    msg.includes("PersonaTargetingInvalidError")
  );
}
