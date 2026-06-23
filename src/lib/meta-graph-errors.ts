export type ParsedMetaGraphError = {
  code?: number;
  subcode?: number;
  message?: string;
  type?: string;
};

export function parseMetaGraphError(error: unknown): ParsedMetaGraphError {
  const raw = error instanceof Error ? error.message : String(error);
  const match = raw.match(/Meta Graph error:\s*\d+\s*(\{[\s\S]*\})/);
  if (!match) {
    return { message: raw };
  }
  try {
    const json = JSON.parse(match[1]) as { error?: ParsedMetaGraphError };
    return json.error ?? { message: raw };
  } catch {
    return { message: raw };
  }
}

/** Meta desabilitou CREATE em /act_{id}/saved_audiences (erro #3 ou mensagem de capability). */
export function isMetaSavedAudienceCreateBlocked(error: unknown): boolean {
  const parsed = parseMetaGraphError(error);
  if (parsed.code === 3) return true;
  const msg = (parsed.message ?? String(error)).toLowerCase();
  return (
    msg.includes("does not have the capability") ||
    msg.includes("can't perform this operation") ||
    msg.includes("cannot perform this operation")
  );
}

export function formatMetaGraphErrorMessage(error: unknown): string {
  const parsed = parseMetaGraphError(error);
  if (parsed.code === 200) {
    return (
      "Permissão negada na Meta. Reconecte em Configurações e confirme que a conta de anúncios autorizou ads_read e ads_management."
    );
  }
  if (parsed.code === 190) {
    return "Token Meta expirado ou inválido. Reconecte em Configurações.";
  }
  const raw = error instanceof Error ? error.message : String(error);
  if (parsed.message && raw.includes("Meta Graph error")) {
    return parsed.message;
  }
  return raw;
}

export function formatMetaSavedAudienceCreateError(error: unknown): string {
  if (isMetaSavedAudienceCreateBlocked(error)) {
    return (
      "A Meta não permite mais criar públicos salvos via API (erro #3). " +
      "O targeting foi salvo na biblioteca Traffic AI e pode ser usado em campanhas — " +
      "ao publicar um conjunto de anúncios, o segmento é enviado à Meta normalmente."
    );
  }
  const parsed = parseMetaGraphError(error);
  return parsed.message ?? (error instanceof Error ? error.message : "Falha ao criar público salvo na Meta");
}
