import { describe, expect, it } from "vitest";

import { formatBrainCreatedAt } from "@/lib/agency-brain/format-created-at";

describe("formatBrainCreatedAt", () => {
  const now = new Date(2026, 5, 16, 15, 0, 0);

  it("formats today with time in pt-BR", () => {
    const iso = new Date(2026, 5, 16, 14, 32, 0).toISOString();
    const result = formatBrainCreatedAt(iso, "pt-BR", now);
    expect(result).toMatch(/^Hoje às /);
    expect(result).toContain("14:32");
  });

  it("formats yesterday with time in pt-BR", () => {
    const iso = new Date(2026, 5, 15, 9, 15, 0).toISOString();
    const result = formatBrainCreatedAt(iso, "pt-BR", now);
    expect(result).toMatch(/^Ontem às /);
    expect(result).toContain("09:15");
  });

  it("formats day before yesterday in pt-BR", () => {
    const iso = new Date(2026, 5, 14, 18, 0, 0).toISOString();
    const result = formatBrainCreatedAt(iso, "pt-BR", now);
    expect(result).toMatch(/^Anteontem às /);
  });

  it("formats older dates as short date only", () => {
    const iso = new Date(2026, 5, 10, 12, 0, 0).toISOString();
    const result = formatBrainCreatedAt(iso, "pt-BR", now);
    expect(result).not.toMatch(/Hoje|Ontem|Anteontem/);
    expect(result).toMatch(/10/);
    expect(result).toMatch(/06/);
    expect(result).toMatch(/2026/);
  });

  it("formats today in en", () => {
    const iso = new Date(2026, 5, 16, 14, 32, 0).toISOString();
    const result = formatBrainCreatedAt(iso, "en", now);
    expect(result).toMatch(/^Today at /);
  });

  it("formats yesterday in en", () => {
    const iso = new Date(2026, 5, 15, 14, 32, 0).toISOString();
    const result = formatBrainCreatedAt(iso, "en", now);
    expect(result).toMatch(/^Yesterday at /);
  });

  it("returns empty string for invalid iso", () => {
    expect(formatBrainCreatedAt("not-a-date", "pt-BR", now)).toBe("");
  });
});
