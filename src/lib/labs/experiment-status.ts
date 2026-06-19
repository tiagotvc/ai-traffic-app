import type { LabsExperimentStatus } from "@/lib/labs/types";

export const LABS_RUNNING_STATUSES: LabsExperimentStatus[] = [
  "queued",
  "running",
  "collecting_data",
  "analyzing",
  "generating_hypotheses",
  "calculating_confidence",
  "finalizing"
];

export function isLabsExperimentRunning(status: LabsExperimentStatus): boolean {
  return LABS_RUNNING_STATUSES.includes(status);
}

export function partitionLabsExperiments<T extends { status: LabsExperimentStatus }>(items: T[]) {
  const running: T[] = [];
  const completed: T[] = [];
  const failed: T[] = [];

  for (const item of items) {
    if (isLabsExperimentRunning(item.status)) running.push(item);
    else if (item.status === "completed") completed.push(item);
    else if (item.status === "failed" || item.status === "cancelled") failed.push(item);
    else completed.push(item);
  }

  return { running, completed, failed };
}
