import { NextResponse } from "next/server";

import { getDataDeletionStatusUrl } from "@/lib/app-url";
import {
  createMetaDeletionConfirmationCode,
  parseMetaSignedRequest,
  processMetaUserDataDeletion
} from "@/lib/meta-data-deletion";
import { getMetaAppSecret } from "@/lib/meta-env";

/** Meta Data Deletion Callback — configured in Meta Developer Dashboard. */
export async function POST(req: Request) {
  const appSecret = getMetaAppSecret();
  if (!appSecret) {
    return NextResponse.json({ error: "Meta app not configured" }, { status: 503 });
  }

  let signedRequest: string | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const value = form.get("signed_request");
    signedRequest = typeof value === "string" ? value : null;
  } else {
    const body = await req.text();
    const params = new URLSearchParams(body);
    signedRequest = params.get("signed_request");
  }

  if (!signedRequest) {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  const parsed = parseMetaSignedRequest(signedRequest, appSecret);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 });
  }

  await processMetaUserDataDeletion(parsed.user_id);

  const confirmation_code = createMetaDeletionConfirmationCode();
  const url = getDataDeletionStatusUrl(confirmation_code);

  return NextResponse.json({ url, confirmation_code });
}
