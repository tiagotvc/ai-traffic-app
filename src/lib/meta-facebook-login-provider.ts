import type { OAuthConfig } from "next-auth/providers";

import { buildMetaFacebookLoginAuthParams } from "@/lib/meta-env";

type MetaFacebookProfile = {
  id: string;
  name?: string;
  picture?: { data?: { url?: string } };
};

export function MetaFacebookLoginProvider(options: {
  clientId: string;
  clientSecret: string;
}): OAuthConfig<MetaFacebookProfile> {
  return {
    id: "facebook-login",
    name: "Facebook",
    type: "oauth",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      url: "https://www.facebook.com/v19.0/dialog/oauth",
      params: buildMetaFacebookLoginAuthParams()
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
