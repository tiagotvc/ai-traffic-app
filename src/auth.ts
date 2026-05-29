import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { repositories } from "@/db/repositories";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "Email e senha",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const { user: userRepo } = await repositories();
        const user = await userRepo.findOne({ where: { email } });
        if (!user?.passwordHash) return null;
        if (!(await verifyPassword(password, user.passwordHash))) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined
        };
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = authConfig.callbacks?.jwt
        ? await authConfig.callbacks.jwt(params)
        : params.token;
      if (params.user?.id) token.userId = params.user.id;
      if (params.user?.email) token.email = params.user.email;
      return token;
    },
    async session(params) {
      const session = authConfig.callbacks?.session
        ? await authConfig.callbacks.session(params)
        : params.session;
      return session;
    }
  }
});
