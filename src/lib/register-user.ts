import { repositories } from "@/db/repositories";
import type { User } from "@/db/entities/User";
import { hashPassword } from "@/lib/password";
import { resolveTenantName } from "@/lib/tenant-name";
import { LEGAL_CONTACT } from "@/lib/marketing/legal-contact";
import type { Attribution } from "@/lib/analytics/attribution";
import { hasAttribution } from "@/lib/analytics/attribution";

export type RegisterResult =
  | { ok: true; userId: string; isNewUser: boolean }
  | { ok: false; error: "EMAIL_TAKEN" | "INVALID_INPUT" };

export async function registerUser(args: {
  email: string;
  password: string;
  name?: string;
  /** Campanha que trouxe a pessoa, vinda pela URL (ver lib/analytics/attribution). */
  attribution?: Attribution;
  /** Escolha no banner de cookies, congelada aqui pro webhook de cobrança consultar depois. */
  analyticsConsent?: "accepted" | "rejected" | null;
}): Promise<RegisterResult> {
  const email = args.email.toLowerCase().trim();
  const password = args.password;
  if (!email.includes("@") || password.length < 6) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  const { user: userRepo, tenant: tenantRepo } = await repositories();

  const existing = await userRepo.findOne({ where: { email } });
  if (existing?.passwordHash) {
    return { ok: false, error: "EMAIL_TAKEN" };
  }

  // Existing passwordless users may have been provisioned by an invite,
  // checkout or social login. Keep that workspace. A genuinely new account
  // always receives a fresh tenant; workspace sharing only happens by invite.
  let tenant = existing?.tenantId
    ? await tenantRepo.findOne({ where: { id: existing.tenantId } })
    : null;
  if (!tenant) {
    const tenantName = resolveTenantName(email);
    tenant = await tenantRepo.save(
      tenantRepo.create({ name: tenantName, brandName: tenantName })
    );
  }

  const passwordHash = await hashPassword(password);

  // No cadastro o usuário marca o checkbox de aceite dos termos — registramos aqui.
  const termsAcceptedAt = new Date();
  const termsAcceptedVersion = LEGAL_CONTACT.termsVersion;

  const consentFields = args.analyticsConsent
    ? { analyticsConsent: args.analyticsConsent, analyticsConsentAt: new Date() }
    : {};
  const attributionFields =
    args.attribution && hasAttribution(args.attribution)
      ? { signupAttribution: args.attribution }
      : {};

  let user: User;
  // `existing` aqui é uma conta-fantasma (criada por convite ou checkout anônimo)
  // ganhando senha — não é cadastro novo, e não deve contar como conversão.
  const isNewUser = !existing;

  if (existing) {
    existing.passwordHash = passwordHash;
    if (args.name) existing.name = args.name;
    existing.tenantId = tenant.id;
    existing.termsAcceptedAt = termsAcceptedAt;
    existing.termsAcceptedVersion = termsAcceptedVersion;
    Object.assign(existing, consentFields);
    // Não sobrescreve a atribuição original: a primeira campanha é que trouxe a pessoa.
    if (!existing.signupAttribution) Object.assign(existing, attributionFields);
    user = await userRepo.save(existing);
  } else {
    user = await userRepo.save(
      userRepo.create({
        email,
        name: args.name?.trim() || null,
        tenantId: tenant.id,
        passwordHash,
        termsAcceptedAt,
        termsAcceptedVersion,
        ...consentFields,
        ...attributionFields
      })
    );
  }

  return { ok: true, userId: user.id, isNewUser };
}
