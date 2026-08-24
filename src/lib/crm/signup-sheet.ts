import "server-only";

import type { Attribution } from "@/lib/analytics/attribution";

/**
 * Registro comercial dos cadastros numa planilha do Google (via Web App do Apps
 * Script). Uma linha por pessoa, atualizada pelo e-mail conforme o status muda.
 *
 * Base legal (LGPD): este é o registro da Orion sobre os próprios clientes —
 * execução de contrato (art. 7º, V), não publicidade. Por isso ele registra todo
 * mundo, independente do banner de cookies, diferente da Pista do Meta.
 *
 * ⚠️ A coluna `consentimento` existe justamente por causa disso: **só as linhas
 * com "sim" podem virar público de remarketing no Meta**. Subir a planilha
 * inteira transformaria este registro em publicidade e quebraria a base legal.
 *
 * Setup da planilha: [[docs/analytics/apps-script-planilha.md]].
 */

export type SignupSheetStatus =
  | "cadastrado"
  | "trial"
  | "assinante"
  | "inadimplente"
  | "cancelado"
  | "suspenso";

export type SignupSheetRow = {
  /** Chave do upsert. */
  email: string;
  status: SignupSheetStatus;
  nome?: string | null;
  telefone?: string | null;
  plano?: string | null;
  /** Em reais/dólares já convertido (a planilha não deve lidar com centavos). */
  valor?: number | null;
  ciclo?: "monthly" | "yearly" | null;
  metodoCadastro?: "email" | "google" | "facebook" | "checkout" | null;
  consentimento?: boolean | null;
  attribution?: Attribution | null;
  /** ISO. Só é gravado na criação da linha; o upsert preserva o original. */
  dataCadastro?: string | null;
};

export const CRM_SHEET_JOB_TYPE = "crm_sheet_sync";

/**
 * Reidrata a linha a partir do payload da fila (que é `Record<string, unknown>`
 * depois de passar pelo jsonb). Lança se o e-mail sumiu — sem chave não há upsert,
 * e um job assim nunca vai dar certo por mais que tente.
 */
export function parseSignupSheetJob(payload: Record<string, unknown>): SignupSheetRow {
  const row = payload as Partial<SignupSheetRow>;
  if (typeof row.email !== "string" || !row.email.includes("@")) {
    throw new Error("crm_sheet: payload sem e-mail válido");
  }
  return { ...row, email: row.email, status: row.status ?? "cadastrado" };
}

function isConfigured(): { url: string; secret: string } | null {
  const url = process.env.CRM_SHEET_WEBHOOK_URL?.trim();
  const secret = process.env.CRM_SHEET_WEBHOOK_SECRET?.trim();
  if (!url || !secret) return null;
  return { url, secret };
}

/**
 * Manda a linha para o Apps Script. **Lança** em caso de falha — de propósito: quem
 * chama passa pela fila de jobs, que tem retry com backoff. Sem as variáveis de
 * ambiente configuradas, sai em silêncio (não é erro, é só não estar ligado).
 */
export async function pushSignupSheetRow(row: SignupSheetRow): Promise<void> {
  const config = isConfigured();
  if (!config) return;

  const body = {
    secret: config.secret,
    row: {
      email: row.email.toLowerCase().trim(),
      status: row.status,
      nome: row.nome ?? "",
      telefone: row.telefone ?? "",
      plano: row.plano ?? "",
      valor: row.valor ?? "",
      ciclo: row.ciclo ?? "",
      metodo_cadastro: row.metodoCadastro ?? "",
      consentimento:
        row.consentimento === true
          ? "sim"
          : row.consentimento === false
            ? "nao"
            : "nao_informado",
      utm_source: row.attribution?.utm_source ?? "",
      utm_medium: row.attribution?.utm_medium ?? "",
      utm_campaign: row.attribution?.utm_campaign ?? "",
      utm_content: row.attribution?.utm_content ?? "",
      utm_term: row.attribution?.utm_term ?? "",
      fbclid: row.attribution?.fbclid ?? "",
      gclid: row.attribution?.gclid ?? "",
      data_cadastro: row.dataCadastro ?? new Date().toISOString(),
      atualizado_em: new Date().toISOString()
    }
  };

  // O Apps Script responde 302 para o domínio script.googleusercontent.com; o fetch
  // segue o redirect sozinho, mas o corpo útil só chega no destino final.
  const res = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "follow",
    signal: AbortSignal.timeout(10_000)
  });

  if (!res.ok) {
    throw new Error(`crm_sheet: HTTP ${res.status}`);
  }

  // O Apps Script devolve 200 mesmo quando rejeita o segredo — precisa ler o corpo.
  const text = await res.text().catch(() => "");
  if (text && !text.includes('"ok":true')) {
    throw new Error(`crm_sheet: resposta inesperada: ${text.slice(0, 200)}`);
  }
}
