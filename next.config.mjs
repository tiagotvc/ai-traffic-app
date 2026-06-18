import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["typeorm", "pg", "reflect-metadata"],
  experimental: {
    serverMinification: false,
    // Middleware buffers POST bodies for all /api routes; default ~10MB truncates large video uploads.
    middlewareClientMaxBodySize: "100mb",
    serverActions: {
      bodySizeLimit: "100mb"
    }
  }
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

