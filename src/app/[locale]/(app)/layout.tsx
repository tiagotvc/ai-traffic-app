import { redirect as nextRedirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { getAppContext } from "@/lib/app-context";
import { repositories } from "@/db/repositories";

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

  const { user, tenant } = await getAppContext();
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
    >
      {children}
    </AppShell>
  );
}
