import "server-only";

export type CloudflareImageResult = {
  imageBase64: string;
  mimeType: string;
};

// FLUX Schnell é o único modelo de imagem da Workers AI que vale usar aqui: ~4.80 neurons
// por tile de 512x512 + 9.60/passo. Os modelos Leonardo (Phoenix/Lucid Origin) também
// funcionam na mesma cota, mas custam ~40x mais neurons por imagem — na prática ~4-5
// gerações por dia antes de estourar a cota INTEIRA (compartilhada, trava até o Schnell).
// Testado direto na API antes de descartar.
const MODEL = "@cf/black-forest-labs/flux-1-schnell";

const DIMENSIONS: Record<"1:1" | "9:16" | "16:9", { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "9:16": { width: 768, height: 1344 },
  "16:9": { width: 1344, height: 768 }
};

/**
 * Cloudflare Workers AI (FLUX Schnell) — cota diária gratuita real (não trial), diferente
 * do Imagen/Nano Banana da Gemini API que exige billing pago mesmo pra 1 imagem. A resposta
 * do Workers AI varia por modelo (alguns devolvem JSON com base64, outros bytes binários
 * direto) — trata os dois formatos em vez de assumir um só.
 */
export async function generateImagesFromPromptCF(args: {
  accountId: string;
  apiToken: string;
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "16:9";
  count: number;
  /** Progresso real por imagem (1-based) — a UI usa isso pra mostrar "gerando imagem 2/4". */
  onProgress?: (index: number, total: number) => void;
}): Promise<CloudflareImageResult[]> {
  const count = Math.min(4, Math.max(1, args.count));
  const dims = DIMENSIONS[args.aspectRatio ?? "1:1"];
  const url = `https://api.cloudflare.com/client/v4/accounts/${args.accountId}/ai/run/${MODEL}`;

  const results: CloudflareImageResult[] = [];
  for (let i = 0; i < count; i++) {
    args.onProgress?.(i + 1, count);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        prompt: args.prompt,
        width: dims.width,
        height: dims.height,
        steps: 4
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cloudflare Workers AI indisponível: ${res.status} ${errText.slice(0, 200)}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as { result?: { image?: string }; errors?: Array<{ message?: string }> };
      const b64 = json.result?.image;
      if (!b64) {
        const errMsg = json.errors?.[0]?.message ?? "sem detalhe";
        throw new Error(`Cloudflare Workers AI não retornou imagem (${errMsg})`);
      }
      results.push({ imageBase64: b64, mimeType: "image/png" });
    } else {
      const buffer = Buffer.from(await res.arrayBuffer());
      results.push({ imageBase64: buffer.toString("base64"), mimeType: contentType || "image/png" });
    }
  }

  return results;
}
