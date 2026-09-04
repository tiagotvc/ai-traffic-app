import { describe, expect, it } from "vitest";
import { defaultGoogleCampaignDraft, GoogleSearchCampaignDraftSchema, parseGoogleKeywordList, validateGoogleCampaignDraft } from "./google-campaign-draft";

describe("google campaign draft", () => {
  it("allows an incomplete draft to be persisted", () => {
    expect(GoogleSearchCampaignDraftSchema.safeParse(defaultGoogleCampaignDraft()).success).toBe(true);
  });

  it("requires linked account, keywords, URL and RSA assets for validation", () => {
    const issues = validateGoogleCampaignDraft(defaultGoogleCampaignDraft("cliente"));
    expect(issues.some((item) => item.includes("conta Google Ads"))).toBe(true);
    expect(issues.some((item) => item.includes("palavras-chave"))).toBe(true);
    expect(issues.some((item) => item.includes("URL HTTPS"))).toBe(true);
  });

  it("accepts a complete search campaign structure", () => {
    const draft = defaultGoogleCampaignDraft("cliente");
    draft.customerId = "1234567890";
    draft.adGroups[0]!.keywords[0]!.text = "agência google ads";
    draft.adGroups[0]!.ads[0]!.finalUrl = "https://example.com";
    draft.adGroups[0]!.ads[0]!.headlines = ["Gestão Google Ads", "Mais Leads", "Fale Conosco"];
    draft.adGroups[0]!.ads[0]!.descriptions = ["Campanhas orientadas a resultado.", "Solicite uma análise da sua conta."];
    expect(validateGoogleCampaignDraft(draft)).toEqual([]);
  });

  it("imports Google keyword list notation and removes duplicates", () => {
    expect(parseGoogleKeywordList('[lavar tapete]\n"lavagem de tapete"\nlimpeza tapete\nLIMPEZA TAPETE')).toEqual([
      { text: "lavar tapete", matchType: "EXACT", negative: false },
      { text: "lavagem de tapete", matchType: "PHRASE", negative: false },
      { text: "limpeza tapete", matchType: "BROAD", negative: false }
    ]);
    expect(parseGoogleKeywordList("grátis\nemprego", true).every((item) => item.negative)).toBe(true);
  });
});
