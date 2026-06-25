import type { AdDraftItem } from "@/lib/campaign-draft";
import { META_AD_COPY_LIMITS } from "@/lib/meta-ad-creative";
import { parseMetaWelcomeMessage, type ParsedWelcomeMessage } from "@/lib/meta-welcome-message";

type AdCreativeCopy = {
  bodies: string[];
  titles: string[];
  descriptions: string[];
  ctas: string[];
};

type StoryDataBlock = Record<string, unknown>;

type MetaCreative = {
  body?: string;
  title?: string;
  page_welcome_message?: unknown;
  object_story_spec?: Record<string, unknown>;
  asset_feed_spec?: {
    images?: Array<{ hash?: string }>;
    videos?: Array<{ video_id?: string }>;
    titles?: Array<{ text?: string }>;
    bodies?: Array<{ text?: string }>;
    descriptions?: Array<{ text?: string }>;
    link_urls?: Array<{ website_url?: string }>;
    call_to_action_types?: string[];
  };
};

export type ImportedAdConfig = {
  titles: string[];
  bodies: string[];
  imageHashes: string[];
  videoIds: string[];
  format: AdDraftItem["format"];
  pageId: string;
  instagramActorId: string | null;
  linkUrl: string;
  linkUrls: string[];
  urlParams: string;
  callToAction: string;
  whatsappWelcomeMessage: string | null;
  messageTemplate: AdDraftItem["messageTemplate"];
  leadFormId: string | null;
  destinationType: AdDraftItem["destinationType"];
  metaCreativeId?: string | null;
  sourceMetaAdId?: string | null;
};

const STORY_DATA_KEYS = ["link_data", "video_data", "template_data", "photo_data"] as const;

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isWhatsappUrl(value: string) {
  const lower = value.toLowerCase();
  return lower.includes("wa.me/") || lower.includes("api.whatsapp.com/") || lower.includes("whatsapp.com/");
}

function addUrl(bucket: string[], value: unknown) {
  if (typeof value === "string" && isHttpUrl(value.trim())) bucket.push(value.trim());
}


function collectWelcomeCandidates(creative?: MetaCreative | null): unknown[] {
  if (!creative) return [];
  const candidates: unknown[] = [creative.page_welcome_message];
  const spec = creative.object_story_spec;
  if (spec) candidates.push(spec.page_welcome_message);
  for (const block of storyBlocks(spec)) {
    candidates.push(block.page_welcome_message);
    const cta = block.call_to_action as StoryDataBlock | undefined;
    const value = cta?.value as StoryDataBlock | undefined;
    if (value) {
      candidates.push(value.page_welcome_message, value.welcome_message, value.greeting);
    }
  }
  return candidates;
}

function extractParsedWelcome(creative?: MetaCreative | null): ParsedWelcomeMessage | null {
  for (const raw of collectWelcomeCandidates(creative)) {
    const parsed = parseMetaWelcomeMessage(raw);
    if (parsed?.greeting) return parsed;
  }
  return null;
}

function extractImageHashFromStorySpec(spec?: Record<string, unknown>): string | undefined {
  if (!spec) return undefined;
  const linkData = spec.link_data as StoryDataBlock | undefined;
  if (typeof linkData?.image_hash === "string") return linkData.image_hash;
  const photoData = spec.photo_data as StoryDataBlock | undefined;
  if (typeof photoData?.image_hash === "string") return photoData.image_hash;
  const videoData = spec.video_data as StoryDataBlock | undefined;
  if (typeof videoData?.image_hash === "string") return videoData.image_hash;
  return undefined;
}

function storyBlocks(spec?: Record<string, unknown>): StoryDataBlock[] {
  if (!spec) return [];
  return STORY_DATA_KEYS.map((key) => spec[key]).filter(
    (block): block is StoryDataBlock => Boolean(block) && typeof block === "object"
  );
}

export function extractLinkUrlsFromCreative(creative?: MetaCreative | null): string[] {
  if (!creative) return [];
  const urls: string[] = [];
  const feed = creative.asset_feed_spec;
  for (const entry of feed?.link_urls ?? []) addUrl(urls, entry.website_url);

  const spec = creative.object_story_spec;
  for (const block of storyBlocks(spec)) {
    addUrl(urls, block.link);
    const cta = block.call_to_action as StoryDataBlock | undefined;
    const value = cta?.value as StoryDataBlock | undefined;
    addUrl(urls, value?.link);
    addUrl(urls, value?.app_link);
  }

  return uniqueStrings(urls);
}

export function extractCallToAction(
  creative?: MetaCreative | null,
  copy?: AdCreativeCopy
): string {
  const ctas: string[] = [];
  if (copy?.ctas?.length) ctas.push(...copy.ctas);
  const feed = creative?.asset_feed_spec;
  if (feed?.call_to_action_types?.length) ctas.push(...feed.call_to_action_types);

  for (const block of storyBlocks(creative?.object_story_spec)) {
    const cta = block.call_to_action as StoryDataBlock | undefined;
    if (typeof cta?.type === "string") ctas.push(cta.type);
  }

  return uniqueStrings(ctas)[0] ?? "";
}

export function extractIcebreakers(creative?: MetaCreative | null): string[] {
  if (!creative) return [];
  const out: string[] = [];
  const candidates: unknown[] = [creative.page_welcome_message];
  const spec = creative.object_story_spec;
  if (spec) candidates.push(spec.page_welcome_message);
  for (const block of storyBlocks(spec)) {
    candidates.push(block.page_welcome_message);
    const cta = block.call_to_action as StoryDataBlock | undefined;
    const value = cta?.value as StoryDataBlock | undefined;
    if (value) candidates.push(value.page_welcome_message);
  }

  for (const raw of candidates) {
    if (!raw || typeof raw !== "object") continue;
    const obj = raw as Record<string, unknown>;
    const ice = obj.ice_breakers ?? obj.icebreakers;
    if (!Array.isArray(ice)) continue;
    for (const item of ice) {
      if (typeof item === "string" && item.trim()) out.push(item.trim());
      else if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        const text = row.title ?? row.response ?? row.text ?? row.question;
        if (typeof text === "string" && text.trim()) out.push(text.trim());
      }
    }
  }
  return uniqueStrings(out);
}

export function extractMessageTemplate(
  creative?: MetaCreative | null,
  destinationType?: AdDraftItem["destinationType"]
): AdDraftItem["messageTemplate"] {
  const parsed = extractParsedWelcome(creative);
  const legacyIce = extractIcebreakers(creative);
  if (!parsed?.greeting && !legacyIce.length) return null;
  const channel =
    destinationType === "whatsapp"
      ? "whatsapp"
      : destinationType === "instant_form"
        ? "messenger"
        : "whatsapp";
  const icebreakers = parsed?.icebreakers.length
    ? parsed.icebreakers
    : legacyIce;
  return {
    channel,
    templateId: null,
    greeting: parsed?.greeting ?? "",
    icebreakers
  };
}

export function extractWhatsappWelcomeMessage(creative?: MetaCreative | null): string | null {
  return extractParsedWelcome(creative)?.greeting ?? null;
}

function splitUrlAndParams(url: string): { linkUrl: string; urlParams: string } {
  try {
    const parsed = new URL(url);
    const params = parsed.search ? parsed.search.replace(/^\?/, "") : "";
    parsed.search = "";
    const base = parsed.toString().replace(/\/$/, "");
    return { linkUrl: base, urlParams: params };
  } catch {
    return { linkUrl: url, urlParams: "" };
  }
}

function pickPrimaryLinkUrl(urls: string[], destinationType: AdDraftItem["destinationType"]) {
  if (!urls.length) return "";
  if (destinationType === "whatsapp") {
    return urls.find(isWhatsappUrl) ?? urls[0]!;
  }
  return urls.find((u) => !u.includes("facebook.com")) ?? urls[0]!;
}

export function inferDestinationType(args: {
  leadFormId: string | null;
  callToAction: string;
  linkUrls: string[];
}): AdDraftItem["destinationType"] {
  if (args.leadFormId) return "instant_form";
  const cta = args.callToAction.toUpperCase();
  if (cta.includes("WHATSAPP")) return "whatsapp";
  if (args.linkUrls.some(isWhatsappUrl)) return "whatsapp";
  return "website";
}

export function extractCreativeRouting(
  creative?: MetaCreative | null,
  copy?: AdCreativeCopy
): Pick<
  ImportedAdConfig,
  | "linkUrl"
  | "linkUrls"
  | "urlParams"
  | "callToAction"
  | "whatsappWelcomeMessage"
  | "messageTemplate"
  | "leadFormId"
  | "destinationType"
  | "pageId"
  | "instagramActorId"
> {
  const linkUrls = extractLinkUrlsFromCreative(creative);
  const story = creative?.object_story_spec;
  const linkData = story?.link_data as StoryDataBlock | undefined;
  const pageId = String(story?.page_id ?? "");
  const instagramActorId = (story?.instagram_actor_id as string | undefined) ?? null;
  const leadFormId = (linkData?.lead_gen_form_id as string | undefined) ?? null;
  const callToAction = extractCallToAction(creative, copy);
  const whatsappWelcomeMessage = extractWhatsappWelcomeMessage(creative);
  const destinationType = inferDestinationType({ leadFormId, callToAction, linkUrls });
  const messageTemplate = extractMessageTemplate(creative, destinationType);
  const primary = pickPrimaryLinkUrl(linkUrls, destinationType);
  const { linkUrl, urlParams } = primary ? splitUrlAndParams(primary) : { linkUrl: "", urlParams: "" };

  return {
    pageId,
    instagramActorId,
    linkUrl,
    linkUrls,
    urlParams,
    callToAction,
    whatsappWelcomeMessage,
    messageTemplate,
    leadFormId,
    destinationType
  };
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
  videoIds: string[];
  format: AdDraftItem["format"];
} {
  if (!creative) return { imageHashes: [], videoIds: [], format: "single_image" };

  const hashes: string[] = [];
  const videoIds: string[] = [];
  const feed = creative.asset_feed_spec;
  for (const img of feed?.images ?? []) {
    if (img.hash) hashes.push(img.hash);
  }
  for (const vid of feed?.videos ?? []) {
    if (vid.video_id) videoIds.push(vid.video_id);
  }

  const spec = creative.object_story_spec;
  const storyHash = extractImageHashFromStorySpec(spec);
  if (storyHash && !hashes.includes(storyHash)) hashes.push(storyHash);

  const videoData = spec?.video_data as StoryDataBlock | undefined;
  const storyVideoId = videoData?.video_id;
  if (typeof storyVideoId === "string" && !videoIds.includes(storyVideoId)) {
    videoIds.push(storyVideoId);
  }

  const hasVideo = videoIds.length > 0;
  const format: AdDraftItem["format"] = hasVideo ? "video" : "single_image";

  return { imageHashes: hashes, videoIds, format };
}

export function buildImportedAdConfig(
  creative: MetaCreative | null | undefined,
  copy: AdCreativeCopy
): ImportedAdConfig {
  const { imageHashes, videoIds, format } = mediaFromMetaCreative(creative);
  const routing = extractCreativeRouting(creative, copy);

  const feed = creative?.asset_feed_spec;
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
  for (const block of storyBlocks(creative?.object_story_spec)) {
    if (typeof block.name === "string") titleList.push(block.name);
    if (typeof block.title === "string") titleList.push(block.title);
    if (typeof block.message === "string") bodyList.push(block.message);
    if (typeof block.description === "string") titleList.push(block.description);
  }

  return {
    titles: uniqueStrings(titleList),
    bodies: uniqueStrings(bodyList),
    imageHashes,
    videoIds,
    format,
    ...routing
  };
}

export function applyImportedToAd(
  ad: AdDraftItem,
  imported: Partial<ImportedAdConfig>,
  mode: "copy" | "media" | "all"
): AdDraftItem {
  const next = { ...ad };
  const shouldReuseCreative =
    (mode === "all" || mode === "media") && Boolean(imported.metaCreativeId?.trim());

  if (mode === "copy" || mode === "all") {
    if (imported.titles?.length) {
      next.titles = [...imported.titles].slice(0, META_AD_COPY_LIMITS.titles);
    }
    if (imported.bodies?.length) {
      next.bodies = [...imported.bodies].slice(0, META_AD_COPY_LIMITS.bodies);
    }
    if (imported.linkUrl) next.linkUrl = imported.linkUrl;
    if (imported.urlParams) next.urlParams = imported.urlParams;
    if (imported.callToAction) next.callToAction = imported.callToAction;
    if (imported.whatsappWelcomeMessage !== undefined) {
      next.whatsappWelcomeMessage = imported.whatsappWelcomeMessage;
    }
    if (imported.messageTemplate !== undefined) {
      next.messageTemplate = imported.messageTemplate;
    }
    if (imported.destinationType) next.destinationType = imported.destinationType;
    if (imported.leadFormId !== undefined) next.leadFormId = imported.leadFormId;
  }
  if (mode === "media" || mode === "all") {
    if (imported.imageHashes?.length) next.imageHashes = [...imported.imageHashes];
    if (imported.videoIds?.length) next.videoIds = [...imported.videoIds];
    if (imported.format) next.format = imported.format;
    if (imported.pageId) next.pageId = imported.pageId;
    if (imported.instagramActorId !== undefined) next.instagramActorId = imported.instagramActorId;
    if (imported.linkUrl) next.linkUrl = imported.linkUrl;
    if (imported.urlParams) next.urlParams = imported.urlParams;
    if (imported.callToAction) next.callToAction = imported.callToAction;
    if (imported.whatsappWelcomeMessage !== undefined) {
      next.whatsappWelcomeMessage = imported.whatsappWelcomeMessage;
    }
    if (imported.messageTemplate !== undefined) {
      next.messageTemplate = imported.messageTemplate;
    }
    if (imported.destinationType) next.destinationType = imported.destinationType;
    if (imported.leadFormId !== undefined) next.leadFormId = imported.leadFormId;
  }
  if (shouldReuseCreative) {
    next.metaCreativeId = imported.metaCreativeId!.trim();
    next.reuseMetaCreative = true;
    if (imported.sourceMetaAdId) next.sourceMetaAdId = imported.sourceMetaAdId;
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
    callToAction: base.callToAction,
    whatsappWelcomeMessage: base.whatsappWelcomeMessage,
    tracking: { ...base.tracking },
    targetAdsetIds: [...base.targetAdsetIds]
  };

  const suffix = locale === "en" ? "copy" : "cópia";
  const titles = base.titles.filter((t) => t.trim());
  const bodies = base.bodies.filter((t) => t.trim());
  const shell = freshAd();

  const creativeReuse = {
    metaCreativeId: null as string | null,
    sourceMetaAdId: null as string | null,
    reuseMetaCreative: false
  };

  if (preset === "same_text") {
    return {
      ...shell,
      ...shared,
      ...creativeReuse,
      name: `${base.name} (${suffix})`,
      format: base.format,
      imageHashes: [],
      videoIds: [],
      titles: titles.length ? [...titles] : [...base.titles],
      bodies: bodies.length ? [...bodies] : [...base.bodies]
    };
  }

  return {
    ...shell,
    ...shared,
    ...creativeReuse,
    name: `${base.name} (${suffix})`,
    format: base.format,
    imageHashes: base.format === "video" ? [] : [...base.imageHashes],
    videoIds: base.format === "video" ? [...base.videoIds] : [],
    titles: [],
    bodies: []
  };
}
