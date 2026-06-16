import { Suspense } from "react";
import { redirect as nextRedirect } from "next/navigation";

import { auth } from "@/auth";
import AppLoading from "@/app/[locale]/(app)/loading";
import { AppShellData } from "@/app/[locale]/(app)/AppShellData";
import { AppShellSkeleton } from "@/components/layout/AppShellSkeleton";

export default async function AppLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.email) nextRedirect(`/${locale}/login`);

  return (
    <AppShellSkeleton
      userName={session.user?.name ?? "Usuário"}
      userEmail={session.user?.email ?? ""}
    >
      <Suspense fallback={<AppLoading />}>
        <AppShellData locale={locale}>{children}</AppShellData>
      </Suspense>
    </AppShellSkeleton>
  );
}
