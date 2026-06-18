import "server-only";

const EXECUTABLE_ORDER = ["competitor", "consumer", "trend"];
const LOGICAL_ORDER = ["hypothesis", "confidence"];

export async function callScientistsWorker(
  path: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const base = process.env.SCIENTISTS_WORKER_URL?.trim();
  const apiKey = process.env.SCIENTISTS_WORKER_API_KEY?.trim();

  if (!base || !apiKey) {
    throw new Error("SCIENTISTS_WORKER_URL and SCIENTISTS_WORKER_API_KEY must be set");
  }

  const res = await fetch(`${base.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(String(json.error ?? `Worker error ${res.status}`));
  }
  return json;
}

export async function runScientistOnWorker(
  experimentId: string,
  scientistId: string,
  userId?: string
): Promise<void> {
  await callScientistsWorker("/internal/labs/run-scientist", {
    experimentId,
    scientistId,
    userId
  });
}

export async function finalizeOnWorker(experimentId: string): Promise<Record<string, unknown>> {
  const json = await callScientistsWorker("/internal/labs/run-experiment-step", { experimentId });
  return (json.dossier as Record<string, unknown>) ?? json;
}

export function orderScientistsForPipeline(selected: string[]): {
  executables: string[];
  logicals: string[];
} {
  const set = new Set(selected);
  return {
    executables: EXECUTABLE_ORDER.filter((id) => set.has(id)),
    logicals: LOGICAL_ORDER.filter((id) => set.has(id))
  };
}
