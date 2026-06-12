import { BillingInvoiceDetailClient } from "@/components/billing/BillingInvoiceDetailClient";

export default async function BillingInvoicePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BillingInvoiceDetailClient invoiceId={id} />;
}
