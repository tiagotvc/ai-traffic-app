const META_CDN_HOSTS = ["fbcdn.net", "facebook.com", "fbsbx.com"];
const DIRECT_VIDEO_RE = /\.(mp4|mov|webm|m4v)(\?|$)/i;

function isDirectVideoUrl(url: string) {
  const lower = url.toLowerCase();
  if (DIRECT_VIDEO_RE.test(url)) return true;
  return lower.includes("/video/") && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url);
}

function isMetaCdnUrl(url: string) {
  return META_CDN_HOSTS.some((host) => url.includes(host));
}

function uniqueUrls(urls: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** Só altera tamanho no path — query params assinados da Meta quebram se mudados. */
function upgradeMetaCdnPath(url: string): string {
  let upgraded = url;

  upgraded = upgraded.replace(/([_/])p(\d+)x(\d+)/gi, (_match, sep: string, w: string, h: string) => {
    const width = Number.parseInt(w, 10);
    if (Number.isNaN(width) || width >= 480) return `${sep}p${w}x${h}`;
    return `${sep}p480x480`;
  });

  upgraded = upgraded.replace(/([_/])s(\d+)x(\d+)/gi, (_match, sep: string, w: string, h: string) => {
    const width = Number.parseInt(w, 10);
    if (Number.isNaN(width) || width >= 480) return `${sep}s${w}x${h}`;
    return `${sep}s480x480`;
  });

  upgraded = upgraded.replace(/stp=dst-jpg_[ps](\d+)x(\d+)/gi, (_match, w: string) => {
    const width = Number.parseInt(w, 10);
    if (Number.isNaN(width) || width >= 480) return _match;
    return "stp=dst-jpg_p480x480";
  });

  return upgraded;
}

/** Prefer full creative URL over Meta thumbnail; bump CDN size when possible. */
export function bestCreativePreviewUrl(
  imageUrl?: string | null,
  thumbnailUrl?: string | null
): string | null {
  return creativePreviewUrlCandidates(imageUrl, thumbnailUrl)[0] ?? null;
}

/** Candidatos em ordem: upgraded → originais (fallback se CDN rejeitar URL alterada). */
export function creativePreviewUrlCandidates(
  imageUrl?: string | null,
  thumbnailUrl?: string | null
): string[] {
  const img = imageUrl?.trim() || null;
  const thumb = thumbnailUrl?.trim() || null;
  const primary = img || thumb;
  if (!primary) return [];

  const imgIsVideo = img ? isDirectVideoUrl(img) : false;
  const ordered =
    imgIsVideo && thumb ? uniqueUrls([thumb, img]) : uniqueUrls([img, thumb]);
  const originals = ordered;
  if (!isMetaCdnUrl(primary)) return originals;

  const upgraded = uniqueUrls(originals.map(upgradeMetaCdnPath));
  const proxied = originals.map((url) => creativePreviewProxyUrl(url));
  // Originais primeiro (URLs assinadas); upgrade e proxy só como fallback.
  return uniqueUrls([...originals, ...upgraded, ...proxied]);
}

/** Proxy same-origin para CDN da Meta (referrer / CORS no browser). */
export function creativePreviewProxyUrl(url: string): string {
  return `/api/creatives/preview?u=${encodeURIComponent(url)}`;
}

/** Use object-cover whenever any preview URL exists (ranking cards fill card width). */
export function shouldUseCoverPreview(
  imageUrl?: string | null,
  thumbnailUrl?: string | null,
  _opts?: { report?: boolean }
): boolean {
  return Boolean(imageUrl?.trim() || thumbnailUrl?.trim());
}
