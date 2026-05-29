import type { DataSourceOptions } from "typeorm";

/** Parse Supabase/local Postgres URL into TypeORM options (SSL + serverless). */
export function postgresOptionsFromUrl(url: string): DataSourceOptions {
  const normalized = url.replace(/^postgresql:\/\//, "postgres://");
  const parsed = new URL(normalized);
  const isSupabase = parsed.hostname.includes("supabase.com");
  const usePooler = parsed.searchParams.get("pgbouncer") === "true";
  const ssl = isSupabase ? { rejectUnauthorized: false } : undefined;
  const isServerless = Boolean(process.env.VERCEL);

  return {
    type: "postgres",
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "").split("?")[0] || "postgres",
    ssl,
    extra: {
      ...(usePooler ? { pgbouncer: true } : {}),
      ...(ssl ? { ssl } : {}),
      ...(isServerless
        ? {
            max: 1,
            idleTimeoutMillis: 10_000,
            connectionTimeoutMillis: 15_000
          }
        : {})
    }
  };
}
