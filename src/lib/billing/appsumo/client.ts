import "server-only";

const TOKEN_URL = "https://appsumo.com/openid/token/";
const LICENSE_KEY_URL = "https://appsumo.com/openid/license_key/";

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  id_token: string;
};

type LicenseKeyResponse = {
  license_key: string;
  status: "active" | "inactive" | "deactivated";
  scopes: string[];
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} not configured`);
  return value;
}

/** Step 2 of the OAuth flow: exchange the single-use `code` from the redirect URL for an access token. */
export async function exchangeAppsumoCode(code: string): Promise<TokenResponse> {
  const clientId = requireEnv("APPSUMO_CLIENT_ID");
  const clientSecret = requireEnv("APPSUMO_CLIENT_SECRET");
  const redirectUri = requireEnv("APPSUMO_REDIRECT_URI");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: "authorization_code"
    })
  });

  if (!res.ok) {
    throw new Error(`AppSumo token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Step 3 of the OAuth flow: fetch the license_key tied to this buyer's purchase. */
export async function fetchAppsumoLicenseKey(accessToken: string): Promise<LicenseKeyResponse> {
  const url = new URL(LICENSE_KEY_URL);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`AppSumo license lookup failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
