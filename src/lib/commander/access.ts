export function canUseCommander(options: {
  planSlug: string;
  allowCommander: boolean;
  platformEnabled: boolean;
  environmentEnabled: boolean;
  platformAdmin?: boolean;
}) {
  if (!options.environmentEnabled || !options.platformEnabled) return false;
  if (options.platformAdmin) return true;
  if (["free", "basic", "basic-plus"].includes(options.planSlug)) return false;
  return options.allowCommander;
}
