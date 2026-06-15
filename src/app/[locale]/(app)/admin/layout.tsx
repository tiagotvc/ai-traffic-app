import { redirect } from "next/navigation";

import { AdminBillingShell } from "@/components/billing/AdminBillingShell";
import { getAppContext } from "@/lib/app-context";

export default async function AdminLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { platformAdmin } = await getAppContext();

  if (!platformAdmin) {
    redirect(`/${locale}/dashboard`);
  }

  return <AdminBillingShell>{children}</AdminBillingShell>;
}
