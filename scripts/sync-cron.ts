/**
 * Cron local (dev): chama o endpoint de sync.
 * Uso: defina CRON_BASE_URL e CRON_SESSION_COOKIE no .env
 */
import "dotenv/config";

const base = process.env.CRON_BASE_URL ?? "http://localhost:3008";
const cookie = process.env.CRON_SESSION_COOKIE;

async function main() {
  const res = await fetch(`${base}/api/sync/run`, {
    method: "POST",
    headers: cookie ? { cookie } : {}
  });
  const json = await res.json().catch(() => ({}));
  // eslint-disable-next-line no-console
  console.log(res.status, json);
  if (!res.ok) process.exit(1);
}

main();
