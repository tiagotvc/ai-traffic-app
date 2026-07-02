import type { Metadata } from "next";

import { routing } from "@/i18n/routing";

/**
 * Base absolute URL of the public site. Set NEXT_PUBLIC_APP_URL in the
 * environment (Vercel) to the production domain; the fallback is only used
 * as a last resort so metadata never renders relative/broken URLs.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.orionagency.io").replace(/\/$/, "");

/** Public, indexable routes (path without the /{locale} prefix). "" = landing. */
export const PUBLIC_SEO_PATHS = ["", "/pricing", "/about", "/support", "/terms", "/privacy", "/data-deletion"] as const;

/**
 * Builds canonical + hreflang alternates for a public page.
 * `path` is the route WITHOUT the locale prefix (e.g. "/pricing", "" for landing).
 * Relative values are resolved against `metadataBase` (set in the root layout).
 */
export function buildAlternates(locale: string, path: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `/${l}${path}`;
  }
  // x-default points at the default locale so search engines pick it for
  // unmatched languages.
  languages["x-default"] = `/${routing.defaultLocale}${path}`;

  return {
    canonical: `/${locale}${path}`,
    languages
  };
}
