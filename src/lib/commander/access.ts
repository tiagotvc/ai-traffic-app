export function canUseCommander(options: {
  planSlug: string;
  allowCommander: boolean;
  platformEnabled: boolean;
  environmentEnabled: boolean;
  platformAdmin?: boolean;
  /** Preferência do usuário (não plataforma): ele desligou o Commander por conta própria. */
  userEnabled?: boolean;
}) {
  if (options.userEnabled === false) return false;
  if (!options.environmentEnabled || !options.platformEnabled) return false;
  if (options.platformAdmin) return true;
  return options.allowCommander;
}
