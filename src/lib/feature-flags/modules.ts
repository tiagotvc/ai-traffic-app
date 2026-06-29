import type { ResolvedFeatureMap } from "./types";

/** Top-level platform modules from the feature registry. */
export type PlatformModuleId =
  | "visions"
  | "campaigns"
  | "audiences"
  | "brain"
  | "reports"
  | "scientists"
  | "ai"
  | "meta";

/** Route prefixes guarded by each module (locale stripped). */
export const MODULE_ROUTE_PREFIXES: Record<PlatformModuleId, string[]> = {
  visions: ["/dashboard/views", "/dashboard/apps"],
  campaigns: ["/campaigns"],
  audiences: ["/audiences"],
  brain: ["/agency-brain", "/automations"],
  reports: ["/reports"],
  scientists: ["/agency-brain/labs"],
  ai: [],
  meta: []
};

export function pathMatchesModule(pathWithoutLocale: string, moduleId: PlatformModuleId): boolean {
  const prefixes = MODULE_ROUTE_PREFIXES[moduleId];
  return prefixes.some(
    (prefix) => pathWithoutLocale === prefix || pathWithoutLocale.startsWith(`${prefix}/`)
  );
}

export function resolveModuleForPath(pathWithoutLocale: string): PlatformModuleId | null {
  for (const moduleId of Object.keys(MODULE_ROUTE_PREFIXES) as PlatformModuleId[]) {
    if (pathMatchesModule(pathWithoutLocale, moduleId)) return moduleId;
  }
  return null;
}

type ShellModuleOpts = {
  ready: boolean;
};

/**
 * Client-side: whether a module is enabled for the current user in the app shell.
 * Uses the resolved boolean map from `/api/me/entitlements` (rollout already applied).
 */
export function isModuleEnabledInShell(
  platformFeatures: ResolvedFeatureMap | undefined,
  moduleId: string,
  opts: ShellModuleOpts
): boolean {
  if (!opts.ready) return false;
  return platformFeatures?.[moduleId] === true;
}
