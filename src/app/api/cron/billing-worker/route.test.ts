import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  processBillingJobs: vi.fn(),
  backfillRecentTrialStartedEmails: vi.fn(),
  processExpiredSubscriptionPeriods: vi.fn(),
  suspendExpiredTrials: vi.fn(),
  suspendOverdueSubscriptions: vi.fn()
}));

vi.mock("@/lib/billing/jobs", () => ({
  processBillingJobs: mocks.processBillingJobs
}));

vi.mock("@/lib/billing/event-handlers", () => ({
  backfillRecentTrialStartedEmails: mocks.backfillRecentTrialStartedEmails,
  processExpiredSubscriptionPeriods: mocks.processExpiredSubscriptionPeriods,
  suspendExpiredTrials: mocks.suspendExpiredTrials,
  suspendOverdueSubscriptions: mocks.suspendOverdueSubscriptions
}));

import { POST } from "./route";

describe("billing worker cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CRON_SECRET", "cron-test-secret");
    mocks.suspendExpiredTrials.mockResolvedValue(2);
    mocks.processExpiredSubscriptionPeriods.mockResolvedValue({ pastDue: 0, downgraded: 0 });
    mocks.suspendOverdueSubscriptions.mockResolvedValue(0);
    mocks.processBillingJobs.mockResolvedValue({ processed: 0, failed: 0 });
    mocks.backfillRecentTrialStartedEmails.mockResolvedValue({ eligible: 0, sent: 0, failed: 0 });
  });

  it("suspende trials antes das demais etapas", async () => {
    await POST(request());

    expect(mocks.suspendExpiredTrials).toHaveBeenCalledOnce();
    expect(mocks.suspendExpiredTrials.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.processBillingJobs.mock.invocationCallOrder[0]
    );
    expect(mocks.suspendExpiredTrials.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.backfillRecentTrialStartedEmails.mock.invocationCallOrder[0]
    );
  });

  it("mantém a suspensão executada quando outro job falha", async () => {
    mocks.processBillingJobs.mockRejectedValue(new Error("provider unavailable"));

    const response = await POST(request());
    const body = await response.json();

    expect(mocks.suspendExpiredTrials).toHaveBeenCalledOnce();
    expect(response.status).toBe(500);
    expect(body.expiredTrials).toEqual({ ok: true, value: 2 });
    expect(body.jobs).toEqual({ ok: false, error: "provider unavailable" });
    expect(mocks.backfillRecentTrialStartedEmails).toHaveBeenCalledOnce();
  });
});

function request() {
  return new Request("https://orion.test/api/cron/billing-worker", {
    method: "POST",
    headers: { authorization: "Bearer cron-test-secret" }
  });
}
