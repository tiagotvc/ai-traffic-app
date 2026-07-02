import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * Private/app areas are auth-gated (they redirect anonymous visitors to
 * /login), but we still tell crawlers explicitly not to waste budget on them.
 * `*` matches the locale prefix (e.g. /pt-BR/dashboard, /en/dashboard).
 */
const DISALLOW = [
  "/api/",
  "/*/dashboard",
  "/*/campaigns",
  "/*/adsets",
  "/*/ads/",
  "/*/creatives",
  "/*/creative-memory",
  "/*/audiences",
  "/*/automations",
  "/*/alerts",
  "/*/reports",
  "/*/clients",
  "/*/settings",
  "/*/onboarding",
  "/*/billing",
  "/*/admin",
  "/*/agency-brain",
  "/*/ai-center",
  "/*/invite",
  "/*/login",
  "/*/report-print"
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOW
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
