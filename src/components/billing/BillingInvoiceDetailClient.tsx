"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

/** Redireciona para o portal com fatura expandida na aba Faturamento. */
export function BillingInvoiceDetailClient({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const t = useTranslations("billingPage");

  useEffect(() => {
    router.replace(`/settings?tab=plan&section=billing&invoice=${invoiceId}`);
  }, [invoiceId, router]);

  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <p className="text-sm text-[var(--text-dim)]">{t("loading")}</p>
    </div>
  );
}
