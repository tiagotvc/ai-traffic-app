import { describe, expect, it } from "vitest";

import {
  buildLegacyVideoAudienceRule,
  legacyVideoEventName,
  parseVideoWithoutPageError
} from "./meta-video-audience-rule";

describe("regra antiga de público de vídeo", () => {
  it("gera um item por vídeo, sem repetir", () => {
    expect(
      buildLegacyVideoAudienceRule({ videoIds: ["1", "2", "1", " "], eventName: "video_view_50" })
    ).toEqual([
      { event_name: "video_view_50_percent", object_id: "1" },
      { event_name: "video_view_50_percent", object_id: "2" }
    ]);
  });

  it("mapeia 75% e 95% para os nomes da Meta", () => {
    expect(legacyVideoEventName("video_view_75")).toBe("video_view_75_percent");
    expect(legacyVideoEventName("video_view_95")).toBe("video_completed");
  });

  it("recusa evento desconhecido", () => {
    expect(() => legacyVideoEventName("video_view_60")).toThrow();
  });
});

describe("vídeo sem Página", () => {
  it("extrai o ID do vídeo recusado", () => {
    expect(
      parseVideoWithoutPageError(
        "Meta Graph error: 400 (#2654) No Page or New Page Experience Association: You can't create a video engagement Custom Audience with video 867906461232843 because this video isn't associated with a Page or New Page Experience."
      )
    ).toBe("867906461232843");
    expect(parseVideoWithoutPageError("(#2654) Invalid event_name")).toBeNull();
  });
});
