import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ suspendExpiredTrials: vi.fn() }));

vi.mock("@/lib/billing/event-handlers", () => ({
  suspendExpiredTrials: mocks.suspendExpiredTrials
}));

import { GET } from "./route";

describe("trial expiration cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    mocks.suspendExpiredTrials.mockResolvedValue(3);
  });

  it("suspende todos os trials vencidos", async () => {
    const response = await GET(authorizedRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, suspended: 3 });
    expect(mocks.suspendExpiredTrials).toHaveBeenCalledOnce();
  });

  it("rejeita chamada sem o segredo do cron", async () => {
    const response = await GET(new Request("https://orion.test/api/cron/trial-expiration"));

    expect(response.status).toBe(401);
    expect(mocks.suspendExpiredTrials).not.toHaveBeenCalled();
  });
});

function authorizedRequest() {
  return new Request("https://orion.test/api/cron/trial-expiration", {
    headers: { authorization: "Bearer cron-test-secret" }
  });
}
