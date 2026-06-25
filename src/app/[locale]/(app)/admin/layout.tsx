import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
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

  return <AdminShell>{children}</AdminShell>;
}
