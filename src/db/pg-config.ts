import type { DataSourceOptions } from "typeorm";

/** Parse Supabase/local Postgres URL into TypeORM options (SSL fix for Node). */
export function postgresOptionsFromUrl(url: string): DataSourceOptions {
  const normalized = url.replace(/^postgresql:\/\//, "postgres://");
  const parsed = new URL(normalized);
  const isSupabase = parsed.hostname.includes("supabase.com");

  return {
    type: "postgres",
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, "").split("?")[0] || "postgres",
    ssl: isSupabase ? { rejectUnauthorized: false } : false,
    extra: parsed.searchParams.get("pgbouncer") === "true" ? { pgbouncer: true } : undefined
  };
}
