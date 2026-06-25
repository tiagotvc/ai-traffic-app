import { redirect as nextRedirect } from "next/navigation";

export default async function MetaSetupPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ metaConnected?: string; metaError?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const qs = new URLSearchParams();
  if (sp.metaConnected === "1") qs.set("metaConnected", "1");
  if (sp.metaError) qs.set("metaError", sp.metaError);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  nextRedirect(`/${locale}/clients/new${suffix}`);
}
