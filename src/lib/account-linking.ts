import "server-only";

import type { User } from "@/db/entities/User";
import type { repositories } from "@/db/repositories";
import { isMetaSyntheticEmail } from "@/lib/tenant-name";

type UserRepo = Awaited<ReturnType<typeof repositories>>["user"];

/** Conta real (email/senha) com o mesmo nome — evita 2º workspace Free no login Facebook. */
export async function findUniqueRealUserByName(
  userRepo: UserRepo,
  name: string
): Promise<User | null> {
  const normalized = name.trim();
  if (!normalized) return null;

  const rows = await userRepo
    .createQueryBuilder("u")
    .where("LOWER(TRIM(u.name)) = LOWER(TRIM(:name))", { name: normalized })
    .getMany();

  const real = rows.filter((u) => !isMetaSyntheticEmail(u.email));
  return real.length === 1 ? real[0] : null;
}

/**
 * Login Facebook sem email: associa facebookId à conta real existente (ex. ilustre.jr@gmail.com).
 */
export async function resolveUserForMetaLogin(
  userRepo: UserRepo,
  args: {
    email: string;
    name?: string | null;
    facebookId?: string | null;
  }
): Promise<User | null> {
  const { email, name, facebookId } = args;

  if (facebookId) {
    const byFacebook = await userRepo.findOne({ where: { facebookId } });
    if (byFacebook) return byFacebook;
  }

  let user = await userRepo.findOne({ where: { email } });

  if (!isMetaSyntheticEmail(email) || !facebookId || !name?.trim()) {
    return user;
  }

  const realUser = await findUniqueRealUserByName(userRepo, name);
  if (!realUser) return user;

  if (user && user.id === realUser.id) {
    if (user.facebookId !== facebookId) {
      user.facebookId = facebookId;
      return userRepo.save(user);
    }
    return user;
  }

  realUser.facebookId = facebookId;
  return userRepo.save(realUser);
}
