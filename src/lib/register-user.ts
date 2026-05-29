import { repositories } from "@/db/repositories";
import type { User } from "@/db/entities/User";
import { hashPassword } from "@/lib/password";
import { resolveTenantName } from "@/lib/tenant-name";

export type RegisterResult =
  | { ok: true; userId: string }
  | { ok: false; error: "EMAIL_TAKEN" | "INVALID_INPUT" };

export async function registerUser(args: {
  email: string;
  password: string;
  name?: string;
}): Promise<RegisterResult> {
  const email = args.email.toLowerCase().trim();
  const password = args.password;
  if (!email.includes("@") || password.length < 6) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  const { user: userRepo, tenant: tenantRepo, client: clientRepo } = await repositories();

  const existing = await userRepo.findOne({ where: { email } });
  if (existing?.passwordHash) {
    return { ok: false, error: "EMAIL_TAKEN" };
  }

  const tenantName = resolveTenantName(email);

  let tenant = await tenantRepo.findOne({ where: { name: tenantName } });
  if (!tenant) {
    tenant = await tenantRepo.save(
      tenantRepo.create({ name: tenantName, brandName: tenantName })
    );
  }

  const passwordHash = await hashPassword(password);

  let user: User;
  if (existing) {
    existing.passwordHash = passwordHash;
    if (args.name) existing.name = args.name;
    existing.tenantId = tenant.id;
    user = await userRepo.save(existing);
  } else {
    user = await userRepo.save(
      userRepo.create({
        email,
        name: args.name?.trim() || null,
        tenantId: tenant.id,
        passwordHash
      })
    );
  }

  const defaultClient = await clientRepo.findOne({
    where: { tenantId: tenant.id, name: "Default" }
  });
  if (!defaultClient) {
    await clientRepo.save(
      clientRepo.create({
        tenantId: tenant.id,
        name: "Default",
        aiContext: {
          note: "Cliente padrão criado automaticamente no MVP."
        }
      })
    );
  }

  return { ok: true, userId: user.id };
}
