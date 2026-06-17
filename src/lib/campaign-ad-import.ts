import type { AdDraftItem } from "@/lib/campaign-draft";

type AdCreativeCopy = {
  bodies: string[];
  titles: string[];
  descriptions: string[];
  ctas: string[];
};

type MetaCreative = {
  body?: string;
  title?: string;
  object_story_spec?: Record<string, unknown>;
  asset_feed_spec?: {
    images?: Array<{ hash?: string }>;
    videos?: Array<{ video_id?: string }>;
    titles?: Array<{ text?: string }>;
    bodies?: Array<{ text?: string }>;
    link_urls?: Array<{ website_url?: string }>;
  };
};

export type ImportedAdConfig = {
  titles: string[];
  bodies: string[];
  imageHashes: string[];
  format: AdDraftItem["format"];
  pageId: string;
  instagramActorId: string | null;
  linkUrl: string;
  leadFormId: string | null;
  destinationType: AdDraftItem["destinationType"];
};

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function extractImageHashFromStorySpec(spec?: Record<string, unknown>): string | undefined {
  if (!spec) return undefined;
  const linkData = spec.link_data as Record<string, unknown> | undefined;
  if (typeof linkData?.image_hash === "string") return linkData.image_hash;
  const photoData = spec.photo_data as Record<string, unknown> | undefined;
  if (typeof photoData?.image_hash === "string") return photoData.image_hash;
  const videoData = spec.video_data as Record<string, unknown> | undefined;
  if (typeof videoData?.image_hash === "string") return videoData.image_hash;
  return undefined;
}

export function copyTextsFromMetaCopy(copy: AdCreativeCopy): {
  titles: string[];
  bodies: string[];
} {
  const titles = uniqueStrings([...copy.titles, ...copy.descriptions]);
  const bodies = uniqueStrings(copy.bodies);
  return { titles, bodies };
}

export function mediaFromMetaCreative(creative?: MetaCreative | null): {
  imageHashes: string[];
  format: AdDraftItem["format"];
} {
  if (!creative) return { imageHashes: [], format: "single_image" };

  const hashes: string[] = [];
  const feed = creative.asset_feed_spec;
  for (const img of feed?.images ?? []) {
    if (img.hash) hashes.push(img.hash);
  }

  const spec = creative.object_story_spec;
  const storyHash = extractImageHashFromStorySpec(spec);
  if (storyHash && !hashes.includes(storyHash)) hashes.push(storyHash);

  const videoData = spec?.video_data as Record<string, unknown> | undefined;
  const hasVideo = Boolean(videoData?.video_id) || Boolean(feed?.videos?.length);
  const format: AdDraftItem["format"] = hasVideo ? "video" : "single_image";

  return { imageHashes: hashes, format };
}

export function buildImportedAdConfig(
  creative: MetaCreative | null | undefined,
  copy: AdCreativeCopy
): ImportedAdConfig {
  const { imageHashes, format } = mediaFromMetaCreative(creative);

  const feed = creative?.asset_feed_spec;
  const story = creative?.object_story_spec;
  const linkData = story?.link_data as Record<string, unknown> | undefined;
  const pageId = String(story?.page_id ?? "");
  const instagramActorId = (story?.instagram_actor_id as string | undefined) ?? null;
  const linkUrl =
    feed?.link_urls?.[0]?.website_url ||
    (typeof linkData?.link === "string" ? linkData.link : "") ||
    "";
  const leadFormId = (linkData?.lead_gen_form_id as string | undefined) ?? null;
  const destinationType = leadFormId ? ("instant_form" as const) : ("website" as const);

  const titleList = [...copy.titles, ...copy.descriptions];
  const bodyList = [...copy.bodies];
  if (!titleList.length && creative?.title) titleList.push(creative.title);
  if (!bodyList.length && creative?.body) bodyList.push(creative.body);
  for (const t of feed?.titles ?? []) {
    if (t.text?.trim()) titleList.push(t.text.trim());
  }
  for (const b of feed?.bodies ?? []) {
    if (b.text?.trim()) bodyList.push(b.text.trim());
  }

  return {
    titles: uniqueStrings(titleList),
    bodies: uniqueStrings(bodyList),
    imageHashes,
    format,
    pageId,
    instagramActorId,
    linkUrl,
    leadFormId,
    destinationType
  };
}

export function applyImportedToAd(
  ad: AdDraftItem,
  imported: Partial<ImportedAdConfig>,
  mode: "copy" | "media" | "all"
): AdDraftItem {
  const next = { ...ad };
  if (mode === "copy" || mode === "all") {
    if (imported.titles?.length) next.titles = [...imported.titles];
    if (imported.bodies?.length) next.bodies = [...imported.bodies];
    if (imported.linkUrl) next.linkUrl = imported.linkUrl;
    if (imported.destinationType) next.destinationType = imported.destinationType;
    if (imported.leadFormId !== undefined) next.leadFormId = imported.leadFormId;
  }
  if (mode === "media" || mode === "all") {
    if (imported.imageHashes?.length) next.imageHashes = [...imported.imageHashes];
    if (imported.format) next.format = imported.format;
    if (imported.pageId) next.pageId = imported.pageId;
    if (imported.instagramActorId !== undefined) next.instagramActorId = imported.instagramActorId;
  }
  return next;
}

export function cloneAdWithPreset(
  base: AdDraftItem,
  preset: "same_text" | "same_image",
  locale: string,
  freshAd: () => AdDraftItem
): AdDraftItem {
  const shared = {
    pageId: base.pageId,
    instagramActorId: base.instagramActorId,
    pixelId: base.pixelId,
    linkUrl: base.linkUrl,
    destinationType: base.destinationType,
    leadFormId: base.leadFormId,
    urlParams: base.urlParams,
    tracking: { ...base.tracking },
    targetAdsetIds: [...base.targetAdsetIds]
  };

  const suffix = locale === "en" ? "copy" : "cópia";
  const titles = base.titles.filter((t) => t.trim());
  const bodies = base.bodies.filter((t) => t.trim());
  const shell = freshAd();

  if (preset === "same_text") {
    return {
      ...shell,
      ...shared,
      name: `${base.name} (${suffix})`,
      format: base.format,
      imageHashes: [],
      titles: titles.length ? [...titles] : [...base.titles],
      bodies: bodies.length ? [...bodies] : [...base.bodies]
    };
  }

  return {
    ...shell,
    ...shared,
    name: `${base.name} (${suffix})`,
    format: base.format,
    imageHashes: [...base.imageHashes],
    titles: [],
    bodies: []
  };
}
