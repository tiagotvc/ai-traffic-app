#!/usr/bin/env node
/**
 * Benchmark de rotas que carregam dados Meta/DB.
 *
 * Uso:
 *   BENCHMARK_BASE_URL=http://localhost:3008 \
 *   BENCHMARK_COOKIE="next-auth.session-token=..." \
 *   BENCHMARK_CLIENT_SLUG=meu-cliente \
 *   node scripts/benchmark-meta-pages.mjs
 *
 * Produção:
 *   BENCHMARK_BASE_URL=https://seu-app.vercel.app \
 *   BENCHMARK_COOKIE="..." \
 *   node scripts/benchmark-meta-pages.mjs
 */

const BASE = (process.env.BENCHMARK_BASE_URL ?? "http://localhost:3008").replace(/\/$/, "");
const COOKIE = process.env.BENCHMARK_COOKIE ?? process.env.BENCHMARK_SESSION_TOKEN ?? "";
const CLIENT = process.env.BENCHMARK_CLIENT_SLUG ?? "";
const RUNS = Math.max(2, Number(process.env.BENCHMARK_RUNS ?? "3"));

function endpoints() {
  const clientQ = CLIENT ? `clientId=${encodeURIComponent(CLIENT)}&` : "";
  return [
    { name: "dashboard/summary (7d)", path: `/api/dashboard/summary?period=last7&${clientQ}`, source: "db" },
    { name: "campaigns/list (DB)", path: `/api/campaigns/list?period=last7&${clientQ}limit=50`, source: "db" },
    {
      name: "campaigns/list (live today)",
      path: `/api/campaigns/list?period=today&live=1&${clientQ}limit=50`,
      source: "meta"
    },
    {
      name: "command-center (live)",
      path: `/api/command-center/campaigns?live=1&${clientQ}status=ACTIVE&period=last7`,
      source: "meta"
    },
    ...(CLIENT
      ? [
          {
            name: "creatives/performance",
            path: `/api/creatives/performance?clientId=${encodeURIComponent(CLIENT)}&period=last7&debug=1`,
            source: "meta"
          }
        ]
      : [])
  ];
}

function parseServerTiming(header) {
  if (!header) return {};
  const out = {};
  for (const part of header.split(",")) {
    const m = part.trim().match(/^(\w+);dur=(\d+)/);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function fetchOnce(path) {
  const headers = {};
  if (COOKIE) {
    if (COOKIE.includes("=")) headers.Cookie = COOKIE;
    else headers.Cookie = `next-auth.session-token=${COOKIE}`;
  }
  const t0 = performance.now();
  const res = await fetch(`${BASE}${path}`, { headers, cache: "no-store" });
  const totalMs = performance.now() - t0;
  const serverTiming = parseServerTiming(res.headers.get("server-timing"));
  const dataSource = res.headers.get("x-data-source") ?? "";
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* ignore */
  }
  return {
    ok: res.ok,
    status: res.status,
    totalMs,
    serverTiming,
    dataSource: dataSource || body?.metricsSource || body?.dataSource || "",
    fetchMs: body?.diag?.fetchMs
  };
}

async function benchmarkEndpoint(ep) {
  const samples = [];
  for (let i = 0; i < RUNS + 1; i++) {
    const r = await fetchOnce(ep.path);
    if (i === 0) continue; // descarta cold start
    samples.push(r);
  }
  const times = samples.map((s) => s.totalMs).sort((a, b) => a - b);
  const last = samples[samples.length - 1];
  return {
    name: ep.name,
    source: ep.source,
    p50: Math.round(percentile(times, 50)),
    p90: Math.round(percentile(times, 90)),
    ok: samples.every((s) => s.ok),
    status: last?.status,
    serverTiming: last?.serverTiming ?? {},
    dataSource: last?.dataSource,
    fetchMs: last?.fetchMs
  };
}

async function main() {
  if (!COOKIE) {
    console.warn("Aviso: defina BENCHMARK_COOKIE ou BENCHMARK_SESSION_TOKEN para rotas autenticadas.\n");
  }
  console.log(`# Benchmark Meta pages\n`);
  console.log(`Base: ${BASE}`);
  console.log(`Runs (sem cold): ${RUNS}\n`);
  console.log("| Endpoint | Fonte | p50 (ms) | p90 (ms) | Server-Timing | Status |");
  console.log("|----------|-------|----------|----------|---------------|--------|");

  for (const ep of endpoints()) {
    try {
      const r = await benchmarkEndpoint(ep);
      const timing = Object.entries(r.serverTiming)
        .map(([k, v]) => `${k}=${v}ms`)
        .join(", ");
      const extra = r.fetchMs != null ? ` fetchMs=${r.fetchMs}` : "";
      console.log(
        `| ${r.name} | ${r.dataSource || r.source} | ${r.p50} | ${r.p90} | ${timing || "—"}${extra} | ${r.ok ? "OK" : r.status} |`
      );
    } catch (err) {
      console.log(`| ${ep.name} | ${ep.source} | — | — | — | ERR ${err.message} |`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
