import { redirect } from "next/navigation";

export default async function MetaOnboardingPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ metaConnected?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const q = sp.metaConnected ? "?metaConnected=1" : "";
  redirect(`/${locale}/onboarding/meta/setup${q}`);
}
