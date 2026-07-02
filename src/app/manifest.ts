import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orion Agency",
    short_name: "Orion",
    description: "Plataforma premium para agências de performance e gestão Meta Ads",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1520",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
