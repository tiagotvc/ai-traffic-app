import { getAppContext } from "@/lib/app-context";

// Faz proxy de download da imagem do criativo (CDN da Meta) com attachment.
const ALLOWED_HOST_SUFFIXES = ["fbcdn.net", "facebook.com", "cdninstagram.com"];

export async function GET(req: Request) {
  // Exige sessão/contexto (gate de auth).
  await getAppContext();

  const params = new URL(req.url).searchParams;
  const u = params.get("u");
  const rawName = params.get("name") || "criativo";
  if (!u) return new Response("missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return new Response("bad url", { status: 400 });
  }

  const host = target.hostname.toLowerCase();
  const allowed =
    target.protocol === "https:" &&
    ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
  if (!allowed) return new Response("forbidden", { status: 403 });

  const upstream = await fetch(target.toString());
  if (!upstream.ok || !upstream.body) {
    return new Response("fetch failed", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "application/octet-stream";
  const ext = contentType.includes("png")
    ? "png"
    : contentType.includes("gif")
      ? "gif"
      : contentType.includes("mp4")
        ? "mp4"
        : contentType.includes("webp")
          ? "webp"
          : "jpg";
  const safeName = rawName.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "criativo";

  return new Response(upstream.body, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="${safeName}.${ext}"`,
      "cache-control": "private, max-age=60"
    }
  });
}
