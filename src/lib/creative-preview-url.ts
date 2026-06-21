const META_CDN_HOSTS = ["fbcdn.net", "facebook.com", "fbsbx.com"];

function isMetaCdnUrl(url: string) {
  return META_CDN_HOSTS.some((host) => url.includes(host));
}

/** Tenta pedir versão maior de thumbs/preview no CDN da Meta. */
function upgradeMetaCdnUrl(url: string): string {
  let upgraded = url;

  upgraded = upgraded.replace(/([_/])p(\d+)x(\d+)/gi, (_match, sep: string, w: string, h: string) => {
    const width = Number.parseInt(w, 10);
    if (Number.isNaN(width) || width >= 480) return `${sep}p${w}x${h}`;
    return `${sep}p720x720`;
  });

  upgraded = upgraded.replace(/([_/])s(\d+)x(\d+)/gi, (_match, sep: string, w: string, h: string) => {
    const width = Number.parseInt(w, 10);
    if (Number.isNaN(width) || width >= 480) return `${sep}s${w}x${h}`;
    return `${sep}s720x720`;
  });

  upgraded = upgraded.replace(/stp=dst-jpg_[ps](\d+)x(\d+)/gi, (_match, w: string, h: string) => {
    const width = Number.parseInt(w, 10);
    if (Number.isNaN(width) || width >= 480) return _match;
    return `stp=dst-jpg_p720x720`;
  });

  if (!isMetaCdnUrl(upgraded)) return upgraded;

  try {
    const parsed = new URL(upgraded);
    parsed.searchParams.delete("width");
    parsed.searchParams.delete("height");
    parsed.searchParams.set("width", "720");
    return parsed.toString();
  } catch {
    return upgraded;
  }
}

/** Prefer full creative URL over Meta thumbnail; bump CDN size when possible. */
export function bestCreativePreviewUrl(
  imageUrl?: string | null,
  thumbnailUrl?: string | null
): string | null {
  const primary = imageUrl?.trim() || thumbnailUrl?.trim() || null;
  if (!primary) return null;

  if (!isMetaCdnUrl(primary)) return primary;

  return upgradeMetaCdnUrl(primary);
}

/** Cover só quando há imagem full distinta do thumb — evita zoom em preview minúsculo. */
export function shouldUseCoverPreview(
  imageUrl?: string | null,
  thumbnailUrl?: string | null
): boolean {
  const img = imageUrl?.trim();
  if (!img) return false;
  const thumb = thumbnailUrl?.trim();
  if (!thumb) return true;
  if (img === thumb) return false;
  return true;
}
