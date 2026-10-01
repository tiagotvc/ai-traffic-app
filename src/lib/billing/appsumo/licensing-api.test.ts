import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  listAppsumoLicenses,
  getAppsumoLicense,
  getAppsumoLicenseEvents,
  getAppsumoLicenseWebhookResponses,
  getAppsumoProfile,
  addAppsumoContact,
  removeAppsumoContact
} = await import("@/lib/billing/appsumo/licensing-api");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("appsumo licensing-api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.APPSUMO_API_KEY = "test-api-key";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.APPSUMO_API_KEY;
  });

  it("throws if APPSUMO_API_KEY is not configured", async () => {
    delete process.env.APPSUMO_API_KEY;
    await expect(getAppsumoLicense("abc")).rejects.toThrow("APPSUMO_API_KEY not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the licensing key header and status filter on listAppsumoLicenses", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));

    await listAppsumoLicenses({ status: "active", page: 2, limit: 50 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://api.licensing.appsumo.com/v2/licenses?status=active&page=2&limit=50"
    );
    expect(init.method).toBe("GET");
    expect(init.headers["X-AppSumo-Licensing-Key"]).toBe("test-api-key");
  });

  it("URL-encodes the license key in path params", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ license_key: "a/b" }));

    await getAppsumoLicense("a/b");

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.licensing.appsumo.com/v2/licenses/a%2Fb");
  });

  it("fetches events and webhook-responses for a specific license", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [{ event: "activate" }] }));
    await getAppsumoLicenseEvents("lic-1");
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://api.licensing.appsumo.com/v2/licenses/lic-1/events"
    );

    fetchMock.mockResolvedValueOnce(jsonResponse({ results: [] }));
    await getAppsumoLicenseWebhookResponses("lic-1");
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://api.licensing.appsumo.com/v2/licenses/lic-1/webhook-responses"
    );
  });

  it("fetches the partner profile", async () => {
    const profile = { id: 1, webhook_url: "https://x", redirect_url: "https://y", contacts: [] };
    fetchMock.mockResolvedValueOnce(jsonResponse(profile));

    await expect(getAppsumoProfile()).resolves.toEqual(profile);
  });

  it("posts a JSON body with Content-Type when adding a contact", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ id: 1, name: "Dev", email: "dev@example.com", created_at: "", updated_at: "" })
    );

    await addAppsumoContact({ email: "dev@example.com", name: "Dev" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.licensing.appsumo.com/v2/profile/contact");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ email: "dev@example.com", name: "Dev" });
  });

  it("does not parse a body on 204 No Content", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(removeAppsumoContact(19)).resolves.toBeUndefined();
  });

  it("throws with status and body text on a non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("not found", { status: 404 }));

    await expect(getAppsumoLicense("missing")).rejects.toThrow(
      "AppSumo Licensing API GET /licenses/missing failed: 404 not found"
    );
  });
});
