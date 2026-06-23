import "server-only";

import crypto from "crypto";

import { repositories } from "@/db/repositories";
import { clearMetaAuth } from "@/lib/meta-auth-store";

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function parseMetaSignedRequest(
  signedRequest: string,
  appSecret: string
): { user_id: string } | null {
  try {
    const [encodedSig, payload] = signedRequest.split(".", 2);
    if (!encodedSig || !payload) return null;

    const sig = base64UrlDecode(encodedSig);
    const expected = crypto.createHmac("sha256", appSecret).update(payload).digest();
    if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return null;

    const data = JSON.parse(base64UrlDecode(payload).toString("utf8")) as { user_id?: string };
    if (!data.user_id) return null;

    return { user_id: data.user_id };
  } catch {
    return null;
  }
}

export function createMetaDeletionConfirmationCode(): string {
  return crypto.randomBytes(12).toString("hex");
}

/** Meta callback: remove OAuth tokens and Facebook link for the given Meta user id. */
export async function processMetaUserDataDeletion(facebookUserId: string): Promise<{ found: boolean }> {
  const { user: userRepo, tenant: tenantRepo } = await repositories();
  const user = await userRepo.findOne({ where: { facebookId: facebookUserId } });
  if (!user) return { found: false };

  await clearMetaAuth(user.id);
  user.facebookId = null;
  await userRepo.save(user);

  const tenant = await tenantRepo.findOne({ where: { id: user.tenantId } });
  if (tenant?.metaConnectionUserId === user.id) {
    tenant.metaConnectionUserId = null;
    await tenantRepo.save(tenant);
  }

  return { found: true };
}
