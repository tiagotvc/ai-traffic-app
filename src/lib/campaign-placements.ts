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

export const AUDIENCE_NETWORK_POSITIONS = ["classic", "rewarded_video", "instream_video"] as const;

export const MESSENGER_POSITIONS = ["messenger_home", "story"] as const;

export const DEVICE_PLATFORMS = ["mobile", "desktop"] as const;

export type PlacementPositionMeta =
  | (typeof FACEBOOK_POSITIONS)[number]
  | (typeof INSTAGRAM_POSITIONS)[number]
  | (typeof AUDIENCE_NETWORK_POSITIONS)[number]
  | (typeof MESSENGER_POSITIONS)[number];

export const PLACEMENT_TREE: Array<{
  platform: PlacementPlatform;
  positions: readonly PlacementPositionMeta[];
}> = [
  { platform: "facebook", positions: FACEBOOK_POSITIONS },
  { platform: "instagram", positions: INSTAGRAM_POSITIONS },
  { platform: "audience_network", positions: AUDIENCE_NETWORK_POSITIONS },
  { platform: "messenger", positions: MESSENGER_POSITIONS }
];

const DEFAULT_POSITIONS_BY_PLATFORM: Record<PlacementPlatform, PlacementPositionMeta[]> = {
  facebook: ["feed", "story"],
  instagram: ["stream", "story"],
  audience_network: ["classic"],
  messenger: ["messenger_home"]
};

export type PlacementConfig = {
  mode: "advantage_plus" | "manual";
  platforms: PlacementPlatform[];
  positions: string[];
  devices: Array<(typeof DEVICE_PLATFORMS)[number]>;
};

export function positionKey(platform: PlacementPlatform, position: string): string {
  return `${platform}:${position}`;
}

export function parsePositionKey(key: string): { platform: PlacementPlatform; position: string } | null {
  const idx = key.indexOf(":");
  if (idx <= 0) return null;
  const platform = key.slice(0, idx) as PlacementPlatform;
  const position = key.slice(idx + 1);
  if (!PLACEMENT_PLATFORMS.includes(platform)) return null;
  return { platform, position };
}

export function normalizePlacementPositions(positions: string[]): string[] {
  const out = new Set<string>();
  for (const raw of positions) {
    if (raw.includes(":")) {
      const parsed = parsePositionKey(raw);
      if (parsed && positionBelongsToPlatform(parsed.platform, parsed.position)) {
        out.add(positionKey(parsed.platform, parsed.position));
      }
      continue;
    }
    for (const { platform, positions: list } of PLACEMENT_TREE) {
      if ((list as readonly string[]).includes(raw)) {
        out.add(positionKey(platform, raw));
      }
    }
  }
  return [...out];
}

function positionBelongsToPlatform(platform: PlacementPlatform, position: string): boolean {
  const group = PLACEMENT_TREE.find((g) => g.platform === platform);
  return group ? (group.positions as readonly string[]).includes(position) : false;
}

export function positionsForPlatform(config: PlacementConfig, platform: PlacementPlatform): string[] {
  return config.positions
    .map((k) => parsePositionKey(k))
    .filter((p): p is { platform: PlacementPlatform; position: string } => p?.platform === platform)
    .map((p) => p.position);
}

export function defaultManualPlacements(): PlacementConfig {
  const platforms: PlacementPlatform[] = ["facebook", "instagram"];
  const positions = platforms.flatMap((p) =>
    DEFAULT_POSITIONS_BY_PLATFORM[p].map((pos) => positionKey(p, pos))
  );
  return {
    mode: "manual",
    platforms,
    positions,
    devices: ["mobile", "desktop"]
  };
}

export const defaultPlacements = (): PlacementConfig => ({
  mode: "advantage_plus",
  platforms: [],
  positions: [],
  devices: []
});

export function togglePlacementPlatform(
  config: PlacementConfig,
  platform: PlacementPlatform
): PlacementConfig {
  const enabled = config.platforms.includes(platform);
  if (enabled) {
    const platforms = config.platforms.filter((p) => p !== platform);
    const positions = config.positions.filter((k) => parsePositionKey(k)?.platform !== platform);
    return { ...config, platforms, positions };
  }
  const defaults = DEFAULT_POSITIONS_BY_PLATFORM[platform].map((pos) => positionKey(platform, pos));
  return {
    ...config,
    platforms: [...config.platforms, platform],
    positions: [...new Set([...config.positions, ...defaults])]
  };
}

export function togglePlacementPosition(
  config: PlacementConfig,
  platform: PlacementPlatform,
  position: string
): PlacementConfig {
  const key = positionKey(platform, position);
  const has = config.positions.includes(key);
  let platforms = config.platforms;
  let positions = config.positions;

  if (has) {
    positions = positions.filter((k) => k !== key);
    const remaining = positionsForPlatform({ ...config, positions }, platform);
    if (!remaining.length) {
      platforms = platforms.filter((p) => p !== platform);
    }
  } else {
    positions = [...positions, key];
    if (!platforms.includes(platform)) {
      platforms = [...platforms, platform];
    }
  }

  return { ...config, platforms, positions };
}

export function placementsToMetaTargeting(placements: PlacementConfig): Record<string, unknown> {
  if (placements.mode === "advantage_plus") return {};

  const out: Record<string, unknown> = {};
  if (placements.platforms.length) out.publisher_platforms = placements.platforms;
  if (placements.devices.length) out.device_platforms = placements.devices;

  const normalized = normalizePlacementPositions(placements.positions);
  const fb: string[] = [];
  const ig: string[] = [];
  const an: string[] = [];
  const msg: string[] = [];

  for (const key of normalized) {
    const parsed = parsePositionKey(key);
    if (!parsed) continue;
    const { platform, position } = parsed;
    if (platform === "facebook") fb.push(position);
    else if (platform === "instagram") ig.push(position);
    else if (platform === "audience_network") an.push(position);
    else if (platform === "messenger") msg.push(position);
  }

  if (fb.length) out.facebook_positions = [...new Set(fb)];
  if (ig.length) out.instagram_positions = [...new Set(ig)];
  if (an.length) out.audience_network_positions = [...new Set(an)];
  if (msg.length) out.messenger_positions = [...new Set(msg)];
  return out;
}

export function coercePlacements(raw: unknown): PlacementConfig {
  if (raw && typeof raw === "object" && "mode" in raw) {
    const p = raw as PlacementConfig;
    return {
      mode: p.mode === "manual" ? "manual" : "advantage_plus",
      platforms: Array.isArray(p.platforms) ? p.platforms : [],
      positions: normalizePlacementPositions(Array.isArray(p.positions) ? p.positions : []),
      devices: Array.isArray(p.devices) ? p.devices : []
    };
  }
  if (raw === "manual") {
    return defaultManualPlacements();
  }
  return defaultPlacements();
}

/** `datetime-local` value in the user's local timezone. */
export function defaultScheduleStartLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
