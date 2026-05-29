import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/app-context";
import { geminiGenerateRecommendations } from "@/lib/gemini";

export async function POST() {
  const { tenant, defaultClient } = await getAppContext();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      text:
        `📊 Relatório — ${defaultClient.name}\n\n` +
        `• Gastos: (sincronize para preencher)\n` +
        `• Conversões: —\n` +
        `• CPA: —\n` +
        `• ROAS: —\n\n` +
        `✅ Destaques:\n- Placeholder do MVP\n\n` +
        `Atenciosamente,\n${tenant.brandName ?? tenant.name}`
    });
  }

  const prompt = [
    "Gere um resumo curto para WhatsApp em PT-BR.",
    "Formato: blocos com quebras de linha, pronto para copiar/colar.",
    "Use emojis moderadamente.",
    "Contexto do cliente (JSON):",
    JSON.stringify(defaultClient.aiContext ?? {}, null, 2)
  ].join("\n");

  // Reuso simples do gerador: retornamos como 1 recomendação e aproveitamos justification como texto.
  // (No próximo passo, trocaremos por um endpoint dedicado de geração de texto.)
  const res = await geminiGenerateRecommendations({ apiKey, prompt });
  const text =
    res.recommendations.map((r) => `• ${r.actionType}: ${r.justification}`).join("\n") ||
    "Resumo indisponível.";

  return NextResponse.json({ ok: true, text });
}

