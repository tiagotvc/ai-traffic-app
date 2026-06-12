import { getAsaasConfig } from "./client";

export function verifyAsaasWebhookToken(req: Request): boolean {
  const { webhookToken } = getAsaasConfig();
  if (!webhookToken) return process.env.NODE_ENV !== "production";
  const header =
    req.headers.get("asaas-access-token") ??
    req.headers.get("x-asaas-access-token") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return header === webhookToken;
}

export type AsaasWebhookPayload = {
  id?: string;
  event: string;
  payment?: {
    id: string;
    customer: string;
    value: number;
    status: string;
    billingType?: string;
    dueDate?: string;
    invoiceUrl?: string;
    subscription?: string;
  };
  subscription?: {
    id: string;
    customer: string;
    status: string;
  };
};
