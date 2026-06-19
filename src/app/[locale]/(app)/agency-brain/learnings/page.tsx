import { redirect } from "@/i18n/navigation";

export default async function AgencyBrainLearningsRedirect({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value === undefined) continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v && key !== "tab") query.set(key, v);
  }
  const qs = query.toString();
  redirect({ href: `/agency-brain${qs ? `?${qs}` : ""}`, locale });
}
