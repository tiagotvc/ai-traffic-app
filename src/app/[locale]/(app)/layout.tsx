import { redirect as nextRedirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";
import { SubscriptionSuspendedError } from "@/lib/billing/entitlements";

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

  let user;
  let tenant;
  let entitlements;
  let platformAdmin = false;
  try {
    ({ user, tenant, entitlements, platformAdmin } = await getAppContext());
  } catch (err) {
    if (err instanceof SubscriptionSuspendedError) {
      nextRedirect(`/${locale}/login?error=account_suspended`);
    }
    throw err;
  }
  const { notificationState: notifRepo, alert: alertRepo } = await repositories();

  let state = await notifRepo.findOne({ where: { userId: user.id } });
  if (!state) state = await notifRepo.save(notifRepo.create({ userId: user.id }));
  state.lastLoginAt = new Date();
  await notifRepo.save(state);

  const alertCount = await alertRepo.count({
    where: { tenantId: tenant.id, dismissed: false }
  });

  return (
    <AppShell
      userName={session.user?.name ?? "Usuário"}
      userEmail={session.user?.email ?? ""}
      alertCount={alertCount}
      planSlug={entitlements.planSlug}
      planName={entitlements.planName}
      subscriptionStatus={entitlements.status}
      allowCreativeMemoryAi={entitlements.limits.allowCreativeMemoryAi}
      isPlatformAdmin={platformAdmin}
    >
      {children}
    </AppShell>
  );
}
