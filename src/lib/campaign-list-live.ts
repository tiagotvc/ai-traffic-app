/**
 * Lista de campanhas: por padrão usa snapshots do banco (rápido).
 * Meta ao vivo só quando o usuário restringe o escopo (cliente ou período).
 */
export function shouldCampaignListFetchLive(input: {
  clientFilter?: string;
  periodUserActivated?: boolean;
  forceLive?: boolean;
  refresh?: boolean;
}): boolean {
  if (input.forceLive || input.refresh) return true;
  if (input.clientFilter?.trim()) return true;
  if (input.periodUserActivated) return true;
  return false;
}
