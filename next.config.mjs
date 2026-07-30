import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Libera acesso ao dev server via túnel (cloudflared/ngrok) para testar OAuth do Meta localmente
  // com HTTPS — necessário pq o app publicado exige redirect_uri https.
  allowedDevOrigins: ["*.trycloudflare.com"],
  // DriverPackageNotInstalledError em produção: marcar "pg" como external package
  // faz o Next confiar no file tracing pra copiar o modulo pro bundle serverless da
  // Vercel, e esse tracing nao estava pegando o require dinamico do driver dentro do
  // TypeORM (confirmado: nem o .nft.json local lista node_modules/pg). Tirando "pg"
  // daqui, o webpack empacota o codigo dele direto no bundle - sem depender de trace.
  serverExternalPackages: ["typeorm", "reflect-metadata"],
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

