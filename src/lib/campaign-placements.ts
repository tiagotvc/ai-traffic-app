export const PLACEMENT_PLATFORMS = ["facebook", "instagram", "audience_network", "messenger"] as const;
export type PlacementPlatform = (typeof PLACEMENT_PLATFORMS)[number];

export const FACEBOOK_POSITIONS = [
  "feed",
  "right_hand_column",
  "instant_article",
  "marketplace",
  "video_feeds",
  "story",
  "search",
  "instream_video",
  "facebook_reels"
] as const;

export const INSTAGRAM_POSITIONS = [
  "stream",
  "story",
  "explore",
  "reels",
  "profile_feed",
  "ig_search"
] as const;

export const AUDIENCE_NETWORK_POSITIONS = [
  "classic",
  "rewarded_video",
  "instream_video"
] as const;

export const MESSENGER_POSITIONS = ["messenger_home", "story"] as const;

export const DEVICE_PLATFORMS = ["mobile", "desktop"] as const;

export type PlacementConfig = {
  mode: "advantage_plus" | "manual";
  platforms: PlacementPlatform[];
  positions: string[];
  devices: Array<(typeof DEVICE_PLATFORMS)[number]>;
};

export const defaultPlacements = (): PlacementConfig => ({
  mode: "advantage_plus",
  platforms: [],
  positions: [],
  devices: []
});

export function placementsToMetaTargeting(placements: PlacementConfig): Record<string, unknown> {
  if (placements.mode === "advantage_plus") return {};

  const out: Record<string, unknown> = {};
  if (placements.platforms.length) out.publisher_platforms = placements.platforms;
  if (placements.devices.length) out.device_platforms = placements.devices;

  const fb = placements.positions.filter((p) =>
    (FACEBOOK_POSITIONS as readonly string[]).includes(p)
  );
  const ig = placements.positions.filter((p) =>
    (INSTAGRAM_POSITIONS as readonly string[]).includes(p)
  );
  const an = placements.positions.filter((p) =>
    (AUDIENCE_NETWORK_POSITIONS as readonly string[]).includes(p)
  );
  const msg = placements.positions.filter((p) =>
    (MESSENGER_POSITIONS as readonly string[]).includes(p)
  );
  if (fb.length) out.facebook_positions = fb;
  if (ig.length) out.instagram_positions = ig;
  if (an.length) out.audience_network_positions = an;
  if (msg.length) out.messenger_positions = msg;
  return out;
}

export function coercePlacements(raw: unknown): PlacementConfig {
  if (raw && typeof raw === "object" && "mode" in raw) {
    const p = raw as PlacementConfig;
    return {
      mode: p.mode === "manual" ? "manual" : "advantage_plus",
      platforms: Array.isArray(p.platforms) ? p.platforms : [],
      positions: Array.isArray(p.positions) ? p.positions : [],
      devices: Array.isArray(p.devices) ? p.devices : []
    };
  }
  if (raw === "manual") {
    return { mode: "manual", platforms: ["facebook", "instagram"], positions: [], devices: ["mobile", "desktop"] };
  }
  return defaultPlacements();
}
