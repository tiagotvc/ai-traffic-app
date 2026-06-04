import type { OAuthConfig } from "next-auth/providers";

/** Scopes Marketing API — sem `email` (Meta rejeita em apps de ads). */
export const META_FACEBOOK_SCOPES =
  "public_profile,ads_read,ads_management,business_management,pages_show_list,pages_read_engagement";

type MetaFacebookProfile = {
  id: string;
  name?: string;
  picture?: { data?: { url?: string } };
};

/**
 * Provider Facebook sem o scope padrão `email` do @auth/core/providers/facebook.
 * O merge do NextAuth mantinha `email` mesmo com authorization.params customizado.
 */
export function MetaFacebookProvider(options: {
  clientId: string;
  clientSecret: string;
}): OAuthConfig<MetaFacebookProfile> {
  return {
    id: "facebook",
    name: "Facebook",
    type: "oauth",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      url: "https://www.facebook.com/v19.0/dialog/oauth",
      params: {
        scope: META_FACEBOOK_SCOPES,
        // Força o Facebook a reexibir o diálogo de autorização (incluindo a seleção
        // de empresas/contas de anúncio) em vez de reaproveitar uma concessão antiga
        // e limitada. Essencial para reconectar e (re)conceder os ativos das BMs.
        auth_type: "reauthorize"
      }
    },
    token: "https://graph.facebook.com/oauth/access_token",
    userinfo: {
      url: "https://graph.facebook.com/me?fields=id,name,picture",
      async request(context: {
        tokens: { access_token?: string };
        provider: { userinfo?: { url?: URL | string } };
      }) {
        const res = await fetch(context.provider.userinfo?.url as URL, {
          headers: { Authorization: `Bearer ${context.tokens.access_token}` }
        });
        return (await res.json()) as MetaFacebookProfile;
      }
    },
    profile(profile) {
      return {
        id: profile.id,
        name: profile.name,
        email: null,
        image: profile.picture?.data?.url
      };
    }
  };
}
