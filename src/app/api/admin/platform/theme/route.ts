import { NextResponse } from "next/server";
import { z } from "zod";

import type { ThemePalette } from "@/lib/design-system/theme-config";
import {
  getDesignSystemThemeConfig,
  resetDesignSystemThemeConfig,
  updateDesignSystemThemeConfig
} from "@/lib/design-system/theme-settings";
import { requireBillingAdmin } from "@/lib/billing/admin-auth";

const colorSchema = z.string().min(1).max(64);

const palettePatchSchema = z
  .object({
    surfaceBg: colorSchema.optional(),
    surfaceCard: colorSchema.optional(),
    textMain: colorSchema.optional(),
    textDim: colorSchema.optional(),
    textDimmer: colorSchema.optional(),
    borderColor: colorSchema.optional(),
    uiAccent: colorSchema.optional(),
    uiAccentMuted: colorSchema.optional(),
    uiAccentBorder: colorSchema.optional(),
    uiAccentBtnFrom: colorSchema.optional(),
    uiAccentBtnTo: colorSchema.optional(),
    uiAccentBtnText: colorSchema.optional(),
    brandPrimary: colorSchema.optional(),
    brandSecondary: colorSchema.optional()
  })
  .partial();

const patchSchema = z.object({
  light: palettePatchSchema.optional(),
  dark: palettePatchSchema.optional(),
  reset: z.boolean().optional()
});

export async function GET() {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  const config = await getDesignSystemThemeConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PATCH(req: Request) {
  const gate = await requireBillingAdmin();
  if (!gate.ok) return gate.response;

  try {
    const body = patchSchema.parse(await req.json());

    if (body.reset) {
      const config = await resetDesignSystemThemeConfig();
      return NextResponse.json({ ok: true, config });
    }

    const config = await updateDesignSystemThemeConfig({
      light: body.light as Partial<ThemePalette> | undefined,
      dark: body.dark as Partial<ThemePalette> | undefined
    });

    return NextResponse.json({ ok: true, config });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Error" },
      { status: 400 }
    );
  }
}
