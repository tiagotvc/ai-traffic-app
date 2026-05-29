import { redirect as nextRedirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { WelcomeBackModal } from "@/components/WelcomeBackModal";
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
  const { auditLog: auditRepo, notificationState: notifRepo, alert: alertRepo } =
    await repositories();

  let state = await notifRepo.findOne({ where: { userId: user.id } });
  if (!state) state = await notifRepo.save(notifRepo.create({ userId: user.id }));

  const since = state.lastLogoutAt ?? new Date(Date.now() - 1000 * 60 * 60 * 24);
  const events = await auditRepo.find({
    where: { tenantId: tenant.id },
    order: { createdAt: "DESC" },
    take: 8
  });
  const recent = events.filter((e) => e.createdAt > since);

  state.lastLoginAt = new Date();
  await notifRepo.save(state);

  const alertCount = await alertRepo.count({
    where: { tenantId: tenant.id, dismissed: false }
  });

  return (
    <>
      <WelcomeBackModal
        events={recent.map((e) => ({
          id: e.id,
          kind: e.kind,
          success: e.success,
          createdAt: e.createdAt.toISOString(),
          errorMessage: e.errorMessage ?? null
        }))}
      />
      <AppShell
        userName={session.user?.name ?? "Usuário"}
        userEmail={session.user?.email ?? ""}
        alertCount={alertCount}
      >
        {children}
      </AppShell>
    </>
  );
}
