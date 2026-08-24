export const CREATIVE_STUDIO_NAV = {
  route: "/creative-studio",
  navKey: "creativeStudio"
} as const;

export const CREATIVE_STUDIO_NAV_ITEMS = [
  { id: "generation", href: "/creative-studio", navKey: "creativeStudioNavGeneration" },
  { id: "canvas", href: "/creative-canvas", navKey: "creativeStudioNavCanvas" },
  { id: "video", href: "/creative-video", navKey: "creativeStudioNavVideo" },
  { id: "library", href: "/creative-library", navKey: "creativeStudioNavLibrary" }
] as const;

export type CreativeStudioNavItemId = (typeof CREATIVE_STUDIO_NAV_ITEMS)[number]["id"];

export function isCreativeStudioActive(base: string): boolean {
  return (
    isCreativeStudioGenerationActive(base) ||
    isCreativeStudioCanvasActive(base) ||
    isCreativeStudioVideoActive(base) ||
    isCreativeStudioLibraryActive(base)
  );
}

export function isCreativeStudioGenerationActive(base: string): boolean {
  return base === "/creative-studio" || base.startsWith("/creative-studio/");
}

export function isCreativeStudioCanvasActive(base: string): boolean {
  return base === "/creative-canvas" || base.startsWith("/creative-canvas/");
}

export function isCreativeStudioVideoActive(base: string): boolean {
  return base === "/creative-video" || base.startsWith("/creative-video/");
}

export function isCreativeStudioLibraryActive(base: string): boolean {
  return base === "/creative-library" || base.startsWith("/creative-library/");
}
