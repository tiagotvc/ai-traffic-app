import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { DM_Sans, Space_Grotesk, Space_Mono } from "next/font/google";
import { getLocale } from "next-intl/server";

import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Orion Agency",
  description: "Plataforma premium para agências de performance e gestão Meta Ads",
  applicationName: "Orion Agency",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }]
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    siteName: "Orion Agency",
    type: "website",
    // Default preview image inherited by every page that doesn't set its own
    // (landing overrides this with a page-specific OG image).
    images: [{ url: "/og-landing.png", width: 1200, height: 630, alt: "Orion Agency" }]
  },
  twitter: {
    card: "summary_large_image"
  },
  robots: {
    index: true,
    follow: true
  }
};

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap"
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

// Telemetry / data face — used on the marketing site for mono readouts and labels.
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap"
});

const themeInitScript = `(function(){try{var t=localStorage.getItem("ai-traffic-theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Render the correct <html lang> server-side so crawlers see the right
  // language on English pages (SetHtmlLang only fixes it after hydration).
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`h-full ${spaceGrotesk.variable} ${dmSans.variable} ${spaceMono.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <body className="h-full font-body" suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
