import type { ReactNode } from "react";

// Root layout: html/body live under [locale]/layout (next-intl)
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
