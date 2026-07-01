import type { ReactNode } from "react";
import Script from "next/script";
import { DM_Sans, Space_Grotesk } from "next/font/google";

import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import "./globals.css";

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

const themeInitScript = `(function(){try{var t=localStorage.getItem("ai-traffic-theme");document.documentElement.setAttribute("data-theme",t==="dark"?"dark":"light");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`h-full ${spaceGrotesk.variable} ${dmSans.variable}`}
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
