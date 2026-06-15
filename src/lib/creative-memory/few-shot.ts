import type { LearningDto } from "@/lib/agency-brain/types";

export function buildFewShotBlock(learnings: LearningDto[], max = 3): string {
  const examples = learnings.slice(0, max).map((l) => ({
    title: l.title,
    description: l.description,
    category: l.category,
    impact: l.impact,
    tags: l.tags?.slice(0, 5) ?? []
  }));

  if (!examples.length) {
    return "";
  }

  return [
    "",
    "Exemplos de aprendizados já aprovados (referência de tom e formato — não copie literalmente):",
    JSON.stringify(examples, null, 2)
  ].join("\n");
}
