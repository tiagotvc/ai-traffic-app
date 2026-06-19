import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}", "./src/app/globals.css"],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "#0f172a",
          hover: "#1e293b",
          line: "#1e293b"
        },
        brand: {
          DEFAULT: "#7c3aed",
          dark: "#6d28d9",
          light: "#ede9fe",
          muted: "#a78bfa"
        },
        surface: {
          DEFAULT: "#f1f5f9",
          card: "#ffffff",
          muted: "#f8fafc",
          line: "#e2e8f0"
        }
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        cardHover: "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)"
      }
    }
  },
  plugins: []
} satisfies Config;
