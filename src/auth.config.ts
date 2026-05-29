import type { NextAuthConfig } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";

import { getAuthSecret } from "@/lib/auth-secret";
import { getMetaAppId, getMetaAppSecret } from "@/lib/meta-env";

/**
 * Config compartilhada — sem imports de DB/TypeORM (compatível com Edge Middleware).
 */
export const authConfig = {
  session: { strategy: "jwt" },
  providers: [
    FacebookProvider({
      clientId: getMetaAppId(),
      clientSecret: getMetaAppSecret(),
      authorization: {
        params: {
          scope:
            "public_profile,email,ads_read,ads_management,business_management,pages_show_list,pages_read_engagement"
        }
      }
    })
  ],
  secret: getAuthSecret(),
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      const previousEmail = token.email;
      const previousUserId = token.userId;

      if (account) {
        token.metaAccessToken = account.access_token;
        token.metaExpiresAt = account.expires_at;
        token.metaTokenType = account.token_type;
        token.metaScopes = (account.scope as string | undefined) ?? undefined;
      }

      if (profile && typeof profile === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p: any = profile;
        token.metaProfileId = p.id ?? token.metaProfileId;
        token.name = p.name ?? token.name;
        token.email = p.email ?? previousEmail ?? user?.email;
      }

      if (user?.email) token.email = user.email;
      if (user?.id) token.userId = user.id;

      // Sem scope "email" no Facebook: mantém email da sessão anterior ou gera estável por profile id
      if (!token.email && token.metaProfileId) {
        token.email = `meta-${token.metaProfileId}@traffic-ai.local`;
      }

      if (!token.userId && previousUserId) {
        token.userId = previousUserId;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string | undefined) ?? "";
        session.user.name = (token.name as string | undefined) ?? session.user.name;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).meta = {
        accessToken: token.metaAccessToken,
        expiresAt: token.metaExpiresAt,
        tokenType: token.metaTokenType,
        scopes: token.metaScopes,
        profileId: token.metaProfileId
      };
      return session;
    }
  }
} satisfies NextAuthConfig;
