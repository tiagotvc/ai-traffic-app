/** Auth.js aceita AUTH_SECRET ou NEXTAUTH_SECRET (vazio = ausente). */
export function getAuthSecret(): string {
  const fromEnv =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "development") {
    return "dev-only-traffic-ai-secret-do-not-use-in-production";
  }

  throw new Error(
    "Defina AUTH_SECRET ou NEXTAUTH_SECRET no .env (ex.: openssl rand -base64 32)"
  );
}
