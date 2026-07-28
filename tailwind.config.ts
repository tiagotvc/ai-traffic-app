import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}", "./src/app/globals.css"],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "var(--sidebar-bg)",
          border: "var(--sidebar-border)"
        },
        brand: {
          DEFAULT: "var(--violet-bright)",
          dark: "var(--violet)",
          light: "#ede9fe",
          muted: "#a78bfa"
        },
        amber: {
          DEFAULT: "var(--amber)",
          bright: "var(--amber-bright)"
        },
        surface: {
          DEFAULT: "var(--surface-bg)",
          card: "var(--surface-card)",
          header: "var(--surface-header)",
          thead: "var(--surface-thead)",
          line: "var(--border-color)"
        },
        ds: {
          main: "var(--text-main)",
          dim: "var(--text-dim)",
          dimmer: "var(--text-dimmer)",
          success: "var(--success)",
          danger: "var(--danger)",
          violet: "var(--violet)"
        }
      },
      fontFamily: {
        heading: ["var(--font-heading)", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      },
      boxShadow: {
        card: "0 1px 8px rgba(0, 0, 0, 0.05)",
        cardHover: "0 12px 32px rgba(0, 0, 0, 0.08)"
      },
      borderRadius: {
        ds: "0.625rem"
      }
    }
  },
  plugins: []
} satisfies Config;
