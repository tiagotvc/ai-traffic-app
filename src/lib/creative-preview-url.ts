/** Prefer full creative URL over Meta thumbnail; bump CDN size when possible. */
export function bestCreativePreviewUrl(
  imageUrl?: string | null,
  thumbnailUrl?: string | null
): string | null {
  const primary = imageUrl?.trim() || thumbnailUrl?.trim() || null;
  if (!primary) return null;

  if (!primary.includes("fbcdn.net") && !primary.includes("facebook.com")) {
    return primary;
  }

  try {
    const url = new URL(primary);
    url.searchParams.delete("width");
    url.searchParams.delete("height");
    url.searchParams.set("width", "640");
    return url.toString();
  } catch {
    return primary;
  }
}
