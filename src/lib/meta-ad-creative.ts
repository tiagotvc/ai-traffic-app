import type { AdDraftItem } from "@/lib/campaign-draft";

export const META_AD_COPY_LIMITS = { titles: 5, bodies: 5 } as const;

export type MetaAssetAdFormat = "SINGLE_IMAGE" | "SINGLE_VIDEO";

export class MetaCreativeValidationError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "MetaCreativeValidationError";
    this.code = code;
  }
}

/** Meta requires exactly one entry in asset_feed_spec.ad_formats. */
export function resolveMetaAdFormat(ad: AdDraftItem): MetaAssetAdFormat | null {
  if (ad.format === "video") {
    return ad.videoIds.length > 0 ? "SINGLE_VIDEO" : null;
  }
  return ad.imageHashes.length > 0 ? "SINGLE_IMAGE" : null;
}

export function validateAdCreativeForMeta(ad: AdDraftItem): string | null {
  const format = resolveMetaAdFormat(ad);
  if (!format) {
    return ad.format === "video" ? "videoRequired" : "mediaRequired";
  }
  if (!ad.titles.some((x) => x.trim())) return "titlesRequired";
  if (!ad.bodies.some((x) => x.trim())) return "bodiesRequired";
  if (ad.format === "video" && ad.imageHashes.length > 0 && ad.videoIds.length === 0) {
    return "creativeFormatMismatch";
  }
  if (ad.format === "single_image" && ad.videoIds.length > 0 && ad.imageHashes.length === 0) {
    return "creativeFormatMismatch";
  }
  return null;
}

export function buildMetaAssetFeedSpec(args: {
  ad: AdDraftItem;
  resolvedLink: string;
  resolvedCta: string;
  /** Omit the off-site website link + CTA (objectives like engagement reject a
   * WEBSITE destination — keeping them triggers Meta error #100). */
  omitLink?: boolean;
}): Record<string, unknown> {
  const { ad, resolvedLink, resolvedCta, omitLink } = args;
  const adFormat = resolveMetaAdFormat(ad);
  if (!adFormat) {
    throw new MetaCreativeValidationError(
      ad.format === "video" ? "videoRequired" : "mediaRequired"
    );
  }

  const spec: Record<string, unknown> = {
    ad_formats: [adFormat],
    titles: ad.titles
      .filter((t) => t.trim())
      .slice(0, META_AD_COPY_LIMITS.titles)
      .map((text) => ({ text: text.trim() })),
    bodies: ad.bodies
      .filter((t) => t.trim())
      .slice(0, META_AD_COPY_LIMITS.bodies)
      .map((text) => ({ text: text.trim() }))
  };

  if (!omitLink) {
    spec.link_urls = [{ website_url: resolvedLink }];
    spec.call_to_action_types = [resolvedCta];
  }

  if (adFormat === "SINGLE_VIDEO") {
    spec.videos = ad.videoIds.map((video_id) => ({ video_id }));
  } else {
    spec.images = ad.imageHashes.map((hash) => ({ hash }));
  }

  return spec;
}
