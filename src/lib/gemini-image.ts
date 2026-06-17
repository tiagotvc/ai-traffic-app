import "server-only";

const IMAGEN_MODEL = process.env.IMAGEN_MODEL?.trim() || "imagen-3.0-generate-002";

export type ImageVariantResult = {
  imageBase64: string;
  mimeType: string;
};

export async function generateImageVariants(args: {
  apiKey: string;
  sourceImageBase64: string;
  mimeType: string;
  prompt?: string;
  count: number;
}): Promise<ImageVariantResult[]> {
  const count = Math.min(4, Math.max(1, args.count));
  const prompt =
    args.prompt?.trim() ||
    "Create a visually similar advertising image variation suitable for social media ads. Keep brand-safe, professional quality.";

  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict`
  );
  url.searchParams.set("key", args.apiKey);

  const results: ImageVariantResult[] = [];

  for (let i = 0; i < count; i++) {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        instances: [
          {
            prompt: `${prompt} (variation ${i + 1})`,
            image: { bytesBase64Encoded: args.sourceImageBase64, mimeType: args.mimeType }
          }
        ],
        parameters: { sampleCount: 1 }
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Imagen unavailable: ${res.status} ${err.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
    };
    const pred = json.predictions?.[0];
    if (!pred?.bytesBase64Encoded) {
      throw new Error("Imagen returned no image data");
    }
    results.push({
      imageBase64: pred.bytesBase64Encoded,
      mimeType: pred.mimeType ?? "image/png"
    });
  }

  return results;
}

export async function fetchImageAsBase64(
  imageUrl: string
): Promise<{ base64: string; mimeType: string }> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Failed to download source image");
  const buf = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  return { base64: buf.toString("base64"), mimeType };
}
