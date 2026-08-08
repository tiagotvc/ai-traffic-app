import "server-only";

import { cache } from "react";

import { auth } from "@/auth";
import { repositories } from "@/db/repositories";
import { resolveUserForMetaLogin } from "@/lib/account-linking";
import {
  assertTenantCanLogin,
  getTenantSubscription
} from "@/lib/billing/entitlements";
import { isPlatformAdmin } from "@/lib/platform-auth";
import { resolveTenantName } from "@/lib/tenant-name";
import {
  acceptPendingInviteForEmail,
  ensureTenantMember,
  getUserWorkspaceMembership
} from "@/lib/workspace-members";
import { IsNull, MoreThan } from "typeorm";

/**
 * Contexto enxuto para o shell do app — sem Meta token, sem entitlements/usage,
 * sem provisioning de cliente default. Usado no layout e deduplicado por request.
 */
export const getAppShellContext = cache(async () => {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Not authenticated");
  }

  const {
    tenant: tenantRepo,
    user: userRepo,
    tenantInvite: inviteRepo,
    tenantMember: memberRepo
  } = await repositories();

  const email = session.user.email.toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metaProfileId = (session as any).meta?.profileId as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const facebookId = metaProfileId ?? ((session as any).meta?.profileId as string | undefined);

  let user = await resolveUserForMetaLogin(userRepo, {
    email,
    name: session.user.name,
    facebookId
  });
  let tenant;
  /** Vira true só no render em que a conta social é criada — dispara a conversão uma vez. */
  let signedUpNow = false;

  const existingMembership = user ? await getUserWorkspaceMembership(user.id) : null;

  if (existingMembership) {
    tenant = await tenantRepo.findOne({ where: { id: existingMembership.tenantId } });
    if (!tenant) {
      await memberRepo.delete({ userId: user!.id });
    } else if (user && user.tenantId !== tenant.id) {
      user.tenantId = tenant.id;
      await userRepo.save(user);
    }
  }

  if (!tenant) {
    const pendingInvite = await inviteRepo.findOne({
      where: { email, acceptedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      order: { createdAt: "DESC" }
    });

    if (pendingInvite) {
      if (!user) {
        user = userRepo.create({
          email,
          name: session.user.name ?? null,
          tenantId: pendingInvite.tenantId
        });
        await userRepo.save(user);
      }
      await acceptPendingInviteForEmail(user, email);
      user = (await userRepo.findOne({ where: { email } }))!;
      tenant = await tenantRepo.findOne({ where: { id: user.tenantId } });
    } else if (user?.tenantId) {
      tenant = await tenantRepo.findOne({ where: { id: user.tenantId } });
    }

    if (!tenant) {
      const tenantName = resolveTenantName(email, metaProfileId);
      let metaTenant = await tenantRepo.findOne({ where: { name: tenantName } });
      if (!metaTenant) {
        metaTenant = tenantRepo.create({ name: tenantName, brandName: tenantName });
        await tenantRepo.save(metaTenant);
      }

      if (!user) {
        user = userRepo.create({
          email,
          name: session.user.name ?? null,
          tenantId: metaTenant.id
        });
        await userRepo.save(user);
        // Cadastro social genuinamente novo (tenant próprio). O caminho de convite
        // acima é membro entrando num tenant existente — não é aquisição, e contar
        // como conversão sujaria a otimização das campanhas.
        signedUpNow = true;
      } else {
        user.tenantId = metaTenant.id;
        await userRepo.save(user);
      }
      tenant = metaTenant;
    }
  }

  if (!user) {
    user = await userRepo.findOne({ where: { email } });
  }
  if (!user) {
    throw new Error("Not authenticated");
  }

  if (!tenant) {
    tenant = await tenantRepo.findOne({ where: { id: user.tenantId } });
  }
  if (!tenant) {
    const tenantName = resolveTenantName(email, metaProfileId);
    tenant = tenantRepo.create({ name: tenantName, brandName: tenantName });
    await tenantRepo.save(tenant);
    user.tenantId = tenant.id;
    await userRepo.save(user);
  }

  await ensureTenantMember(tenant.id, user.id);

  if (signedUpNow) {
    await recordSocialSignup(user, tenant.id, session.user.name ?? null, facebookId);
  }

  const platformAdmin = await isPlatformAdmin(user.id);
  if (!platformAdmin) {
    await assertTenantCanLogin(tenant.id);
  }

  let subscriptionStatus = "active";
  let planSlug = "free";
  let planName = "Free";
  try {
    const { subscription, plan } = await getTenantSubscription(tenant.id);
    subscriptionStatus = subscription.status;
    planSlug = plan?.slug ?? "free";
    planName = plan?.name ?? "Free";
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[getAppShellContext] subscription lookup failed:", err);
  }

  return {
    session,
    user,
    tenant,
    platformAdmin,
    subscriptionStatus,
    planSlug,
    planName
  };
});

export const getTenantContextSlim = cache(async () => {
  const { user, tenant } = await getAppShellContext();
  return { userId: user.id, tenantId: tenant.id, user, tenant };
});

/**
 * Registra o cadastro por login social (Google/Facebook), que antes não gerava
 * conversão nenhuma. Roda uma única vez, no render em que a conta é criada.
 *
 * Nunca lança: se o rastreio falhar, o usuário ainda tem que conseguir entrar.
 */
async function recordSocialSignup(
  user: { id: string; email: string },
  tenantId: string,
  displayName: string | null,
  facebookId?: string
): Promise<void> {
  try {
    const [{ onUserSignedUp }, { consumePendingAttribution }, consent, metaCookies, { headers }] =
      await Promise.all([
        import("@/lib/analytics/signup-events"),
        import("@/lib/analytics/oauth-attribution"),
        import("@/lib/server-consent").then((m) => m.hasServerAnalyticsConsent()),
        import("@/lib/server-consent").then((m) => m.readMetaBrowserCookies()),
        import("next/headers")
      ]);

    const attribution = await consumePendingAttribution();
    const h = await headers();

    // Congela o consentimento no usuário: o webhook de cobrança roda sem navegador
    // e não teria como checar o cookie antes de mandar Purchase pra Meta.
    const { user: userRepo } = await repositories();
    await userRepo.update(user.id, {
      analyticsConsent: consent ? "accepted" : "rejected",
      analyticsConsentAt: new Date(),
      ...(attribution ? { signupAttribution: attribution } : {})
    });

    await onUserSignedUp({
      userId: user.id,
      email: user.email,
      name: displayName,
      tenantId,
      method: facebookId ? "facebook" : "google",
      attribution,
      hasAnalyticsConsent: consent,
      ...metaCookies,
      clientIpAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim(),
      clientUserAgent: h.get("user-agent") ?? undefined
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[getAppShellContext] falha ao registrar cadastro social:", err);
  }
}
