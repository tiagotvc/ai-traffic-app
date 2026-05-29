import type { NextAuthConfig } from "next-auth";

import { getAuthSecret } from "@/lib/auth-secret";
import { MetaFacebookProvider } from "@/lib/meta-facebook-provider";
import { getMetaAppId, getMetaAppSecret } from "@/lib/meta-env";
import { metaEmailFromProfileId } from "@/lib/tenant-name";

type FacebookProfile = {
  id?: string;
  name?: string;
  email?: string | null;
};

/**
 * Config compartilhada — sem imports de DB/TypeORM (compatível com Edge Middleware).
 */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    MetaFacebookProvider({
      clientId: getMetaAppId(),
      clientSecret: getMetaAppSecret()
    })
  ],
  secret: getAuthSecret(),
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      const previousProfileId =
        typeof token.metaProfileId === "string" ? token.metaProfileId : undefined;

      if (account?.provider === "facebook" && profile && typeof profile === "object") {
        const p = profile as FacebookProfile;
        const newProfileId = p.id;

        if (newProfileId) {
          const hadSession = Boolean(previousProfileId && token.email);
          const profileChanged = Boolean(
            previousProfileId && previousProfileId !== newProfileId
          );

          if (hadSession && profileChanged) {
            token.metaOAuthError = "PROFILE_MISMATCH";
          } else {
            delete token.metaOAuthError;

            if (!previousProfileId || profileChanged) {
              token.metaProfileId = newProfileId;
              token.name = p.name ?? token.name;
              token.email = p.email ?? metaEmailFromProfileId(newProfileId);
              delete token.userId;
            } else {
              token.metaProfileId = newProfileId;
              if (p.name) token.name = p.name;
            }

            token.metaAccessToken = account.access_token;
            token.metaExpiresAt = account.expires_at;
            token.metaTokenType = account.token_type;
            token.metaScopes = (account.scope as string | undefined) ?? undefined;
          }
        }
      } else if (account) {
        token.metaAccessToken = account.access_token;
        token.metaExpiresAt = account.expires_at;
        token.metaTokenType = account.token_type;
        token.metaScopes = (account.scope as string | undefined) ?? undefined;
      }

      if (user?.email) token.email = user.email;
      if (user?.id) token.userId = user.id;

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

      if (token.metaOAuthError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).metaOAuthError = token.metaOAuthError;
      }

      return session;
    }
  }
} satisfies NextAuthConfig;
