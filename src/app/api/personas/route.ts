import { NextResponse } from "next/server";
import { z } from "zod";

import { getAppContext } from "@/lib/app-context";
import {
  createUserPersona,
  listUserPersonas
} from "@/lib/user-persona-zone";

const CreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  ageMin: z.number().int().min(13).max(65).optional(),
  ageMax: z.number().int().min(13).max(65).optional(),
  gender: z.enum(["all", "male", "female"]).optional(),
  targeting: z.record(z.string(), z.unknown()),
  sourcePrompt: z.string().optional()
});

export async function GET() {
  const { tenant, user } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const personas = await listUserPersonas({ tenantId: tenant.id, userId: user.id });
  return NextResponse.json({ ok: true, personas });
}

export async function POST(req: Request) {
  const { tenant, user } = await getAppContext();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
  }

  const body = CreateSchema.parse(await req.json().catch(() => ({})));
  const persona = await createUserPersona({
    tenantId: tenant.id,
    userId: user.id,
    name: body.name,
    description: body.description,
    ageMin: body.ageMin,
    ageMax: body.ageMax,
    gender: body.gender,
    targeting: body.targeting,
    sourcePrompt: body.sourcePrompt
  });

  return NextResponse.json({ ok: true, persona });
}
