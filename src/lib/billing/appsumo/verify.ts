import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verifies the `X-Appsumo-Signature` header: HMAC SHA256 of `timestamp + rawBody`, signed
 * with the partner API key. Mirrors the strictness of `verifyStripeWebhook` — throws instead
 * of silently accepting an unsigned or mismatched request.
 */
export function verifyAppsumoSignature(rawBody: string, timestamp: string, signature: string): void {
  const apiKey = process.env.APPSUMO_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("APPSUMO_API_KEY not configured");
  }
  const expected = createHmac("sha256", apiKey).update(timestamp + rawBody).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  const valid =
    expectedBuf.length === signatureBuf.length && timingSafeEqual(expectedBuf, signatureBuf);

  if (!valid) {
    throw new Error("Invalid AppSumo webhook signature");
  }
}
