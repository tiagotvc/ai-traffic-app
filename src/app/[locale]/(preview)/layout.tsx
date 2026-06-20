import type { ReactNode } from "react";

import { UxThemeProvider } from "@/uxpilot-ui/adapters/ThemeProvider";

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <UxThemeProvider>
      <div data-theme="light" className="min-h-screen" style={{ background: "var(--surface-bg)" }}>
        {children}
      </div>
    </UxThemeProvider>
  );
}
