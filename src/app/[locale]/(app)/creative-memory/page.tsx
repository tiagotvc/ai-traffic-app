import { redirect } from "@/i18n/navigation";

export default async function CreativeMemoryPage({
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
    if (v) query.set(key, v);
  }
  const qs = query.toString();
  redirect({ href: `/agency-brain/learnings${qs ? `?${qs}` : ""}`, locale });
}
