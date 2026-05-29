import type { MetaAdAccount } from "@/lib/meta-graph";

/** Graph ad account_status: 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, etc. */
export function formatMetaAdAccountLabel(acc: Pick<MetaAdAccount, "id" | "name" | "account_status">): string {
  const base = acc.name?.trim() || acc.id;
  if (acc.account_status === 1) return base;
  if (acc.account_status === 2) return `${base} (desativada)`;
  if (acc.account_status === 3) return `${base} (pendente)`;
  if (acc.account_status != null) return `${base} (status ${acc.account_status})`;
  return base;
}

export function isMetaAdAccountActive(accountStatus?: number): boolean {
  return accountStatus === undefined || accountStatus === 1;
}
