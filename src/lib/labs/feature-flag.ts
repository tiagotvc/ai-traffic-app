/** Public rollout flag — when set, all users can access Labs. */
export function isLabsPublicEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LABS_ENABLED === "1";
}

/** Labs available for this user (public flag or platform admin). */
export function isLabsEnabledForUser(isPlatformAdmin?: boolean): boolean {
  return isLabsPublicEnabled() || Boolean(isPlatformAdmin);
}
