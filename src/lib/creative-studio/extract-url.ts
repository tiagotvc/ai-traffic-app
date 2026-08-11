import "server-only";

export type PageSummary = {
  title: string;
  description: string;
};

function extractTag(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  return match?.[1]?.trim() || null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Extração leve (sem parser de HTML — nenhuma lib desse tipo já instalada no projeto):
 * título + meta description/og:description. Suficiente pra virar contexto de geração,
 * não precisa reconstruir a página.
 */
export async function extractPageSummary(url: string): Promise<PageSummary> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Link inválido.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Link precisa ser http(s).");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let html: string;
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; OrionCreativeStudio/1.0)" }
    });
    if (!res.ok) throw new Error(`Não consegui acessar o link (HTTP ${res.status}).`);
    html = await res.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("O link demorou demais pra responder.");
    }
    throw err instanceof Error ? err : new Error("Não consegui acessar o link.");
  } finally {
    clearTimeout(timeout);
  }

  const title =
    extractTag(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    extractTag(html, /<title[^>]*>([^<]+)<\/title>/i) ??
    "";
  const description =
    extractTag(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
    extractTag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    "";

  if (!title && !description) {
    throw new Error("Não achei título nem descrição nessa página — tenta descrever manualmente.");
  }

  return {
    title: decodeEntities(title).slice(0, 200),
    description: decodeEntities(description).slice(0, 500)
  };
}
