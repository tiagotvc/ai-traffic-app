import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

import { getAuthSecret } from "@/lib/auth-secret";
import { isGoogleOAuthConfigured, getGoogleClientId, getGoogleClientSecret } from "@/lib/google-env";
import { MetaFacebookLoginProvider } from "@/lib/meta-facebook-login-provider";
import { getMetaAppId, getMetaAppSecret, isMetaOAuthConfigured } from "@/lib/meta-env";
import { metaEmailFromProfileId } from "@/lib/tenant-name";

type FacebookProfile = {
  id?: string;
  name?: string;
  email?: string | null;
};

type GoogleProfile = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
};

const providers: NextAuthConfig["providers"] = [];

if (isGoogleOAuthConfigured()) {
  providers.push(
    Google({
      clientId: getGoogleClientId(),
      clientSecret: getGoogleClientSecret(),
      authorization: { params: { prompt: "consent", access_type: "offline", response_type: "code" } }
    })
  );
}

if (isMetaOAuthConfigured()) {
  providers.push(
    MetaFacebookLoginProvider({
      clientId: getMetaAppId(),
      clientSecret: getMetaAppSecret()
    })
  );
}

/**
 * Config compartilhada — sem imports de DB/TypeORM (compatível com Edge Middleware).
 */
export const authConfig = {
  trustHost: true,
  // Keep authenticated browser sessions bounded to one day. NextAuth uses this
  // value for both the JWT expiry and the session cookie lifetime.
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  providers,
  secret: getAuthSecret(),
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      const previousProfileId =
        typeof token.metaProfileId === "string" ? token.metaProfileId : undefined;

      if (account?.provider === "facebook-login" && profile && typeof profile === "object") {
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
            token.metaProfileId = newProfileId;
            token.facebookId = newProfileId;
            token.name = p.name ?? token.name;
            token.email = p.email ?? metaEmailFromProfileId(newProfileId);
            delete token.userId;
          }
        }
      } else if (account?.provider === "google" && profile && typeof profile === "object") {
        const p = profile as GoogleProfile;
        if (p.sub) token.googleId = p.sub;
        if (p.email) token.email = p.email.toLowerCase();
        if (p.name) token.name = p.name;
        if (p.picture) token.picture = p.picture;
        delete token.userId;
      }

      if (user?.email) token.email = user.email;
      if (user?.id) token.userId = user.id;

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string | undefined) ?? "";
        session.user.name = (token.name as string | undefined) ?? session.user.name;
        if (token.picture) session.user.image = token.picture as string;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).meta = {
        profileId: token.metaProfileId
      };

      if (token.metaOAuthError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).metaOAuthError = token.metaOAuthError;
      }

      if (token.googleId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).googleId = token.googleId;
      }

      return session;
    }
  }
} satisfies NextAuthConfig;
