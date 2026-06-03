import "server-only";

export type MetaErrorContext = {
  isWorkspaceMember?: boolean;
  tokenSource?: "workspace" | "own" | null;
};

/** Mensagem legível para erros da Meta Graph API. */
export function formatMetaGraphError(err: unknown, context?: MetaErrorContext): string {
  if (!(err instanceof Error)) return "Erro desconhecido na Meta.";

  const raw = err.message;
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: {
          message?: string;
          code?: number;
          error_subcode?: number;
          type?: string;
          error_user_msg?: string;
          error_user_title?: string;
        };
      };
      const e = parsed.error;
      if (e?.message) {
        const code = e.code != null ? ` (código ${e.code})` : "";
        const userHint = e.error_user_msg?.trim();
        if (e.code === 190) return `Token Meta expirado ou inválido. Reconecte em Configurações.${code}`;
        if (e.code === 104) return `Sessão Meta inválida. Reconecte o Facebook.${code}`;
        if (e.code === 200) {
          const detail = e.message?.trim() || "Permissão negada";
          if (context?.isWorkspaceMember) {
            return `A conexão Meta do administrador do workspace não tem acesso a esta conta de anúncios (${detail}). Peça ao administrador para reconectar em Configurações ou confirmar que a conta ainda está compartilhada no Gerenciador de Anúncios.${code}`;
          }
          if (context?.tokenSource === "workspace") {
            return `Sem acesso a esta conta de anúncios com a conexão Meta do workspace (${detail}). Reconecte em Configurações ou verifique se o cliente ainda compartilhou a conta no Gerenciador de Anúncios.${code}`;
          }
          return `Permissão negada na Meta (${detail}). Reconecte em Configurações ou verifique o acesso à conta no Gerenciador de Anúncios.${code}`;
        }
        if (e.code === 4 || e.code === 17 || e.code === 32 || e.code === 613) {
          const title = e.error_user_title?.trim();
          const base =
            userHint ||
            title ||
            "A Meta limitou temporariamente as consultas deste app. Aguarde alguns minutos e tente de novo.";
          return `${base}${code}`;
        }
        if (userHint) return `${userHint}${code}`;
        return `${e.message}${code}`;
      }
    } catch {
      /* fall through */
    }
  }

  if (raw.includes("access token")) {
    return "Token de acesso Meta ausente ou inválido. Reconecte em Configurações.";
  }
  if (raw.includes("Aguarde")) return raw;

  return raw.length > 280 ? `${raw.slice(0, 280)}…` : raw;
}
