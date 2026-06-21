import { getAppContext } from "@/lib/app-context";

const ALLOWED_HOST_SUFFIXES = ["fbcdn.net", "facebook.com", "cdninstagram.com", "fbsbx.com"];

export async function GET(req: Request) {
  await getAppContext();

  const params = new URL(req.url).searchParams;
  const u = params.get("u");
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

  const contentType = upstream.headers.get("content-type") || "image/jpeg";

  return new Response(upstream.body, {
    headers: {
      "content-type": contentType,
      "cache-control": "private, max-age=3600"
    }
  });
}
