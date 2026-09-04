import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { listAccessibleCustomerGroups } from "@/lib/google-ads-api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

describe("listAccessibleCustomerGroups", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("separa contas-filhas por MCC e preserva acessos diretos", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ resourceNames: ["customers/111", "customers/333"] })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              customer: {
                id: "111",
                descriptiveName: "MCC Principal",
                manager: true
              }
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              customer: {
                id: "333",
                descriptiveName: "Conta direta",
                manager: false
              }
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              customerClient: {
                clientCustomer: "customers/444",
                descriptiveName: "Cliente da MCC",
                manager: false,
                level: "1",
                hidden: false
              }
            }
          ]
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listAccessibleCustomerGroups("token")).resolves.toEqual([
      {
        id: "111",
        descriptiveName: "MCC Principal",
        accounts: [
          {
            id: "444",
            descriptiveName: "Cliente da MCC",
            currencyCode: null,
            timeZone: null,
            manager: false
          }
        ]
      },
      {
        id: "direct",
        descriptiveName: null,
        accounts: [
          {
            id: "333",
            descriptiveName: "Conta direta",
            currencyCode: null,
            timeZone: null,
            manager: false
          }
        ]
      }
    ]);
  });
});
