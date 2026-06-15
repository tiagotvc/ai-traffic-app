import { MetaSetupWizard } from "@/components/onboarding/MetaSetupWizard";

export default async function MetaSetupPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ metaConnected?: string }>;
}) {
  const { locale } = await params;
  const { metaConnected } = await searchParams;

  return (
    <div className="py-8">
      <MetaSetupWizard locale={locale} metaConnected={metaConnected === "1"} />
    </div>
  );
}
