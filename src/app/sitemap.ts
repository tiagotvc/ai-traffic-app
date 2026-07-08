import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { PUBLIC_SEO_PATHS, SITE_URL } from "@/lib/seo";

/**
 * One entry per public path, listed under the default locale, with hreflang
 * alternates for every other locale so Google/Bing serve the right language.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_SEO_PATHS.map((path) => {
    const languages: Record<string, string> = {};
    for (const locale of routing.locales) {
      languages[locale] = `${SITE_URL}/${locale}${path}`;
    }
    // x-default points crawlers at the default locale for unmatched languages,
    // matching the alternates emitted in each page's metadata.
    languages["x-default"] = `${SITE_URL}/${routing.defaultLocale}${path}`;

    return {
      url: `${SITE_URL}/${routing.defaultLocale}${path}`,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : 0.7,
      alternates: { languages }
    };
  });
}
