import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Libera acesso ao dev server via túnel (cloudflared/ngrok) para testar OAuth do Meta localmente
  // com HTTPS — necessário pq o app publicado exige redirect_uri https.
  allowedDevOrigins: ["*.trycloudflare.com"],
  serverExternalPackages: ["typeorm", "pg", "reflect-metadata"],
  // O checker de tipos embutido do `next build` trava por dezenas de minutos na
  // Vercel (bate o timeout do build) nesse projeto — `pnpm tsc --noEmit` faz a
  // mesma checagem em segundos. Roda o tsc explícito antes do build (vercel-build)
  // e deixa o Next pular a checagem interna, que é só o gargalo.
  typescript: {
    ignoreBuildErrors: true
  },
  experimental: {
    serverMinification: false,
    // Middleware/proxy buffers POST bodies; default ~10MB truncates large uploads.
    proxyClientMaxBodySize: "100mb",
    serverActions: {
      bodySizeLimit: "100mb"
    }
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false
      };
    }
    return config;
  }
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true
});

