import { redirect } from "@/i18n/navigation";

export default async function BillingPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = new URLSearchParams();

  const tab = sp.tab;
  q.set("tab", typeof tab === "string" ? tab : "plan");

  for (const key of ["invoice", "checkout"] as const) {
    const value = sp[key];
    if (typeof value === "string") q.set(key, value);
  }

  redirect({ href: `/settings?${q.toString()}`, locale });
}
