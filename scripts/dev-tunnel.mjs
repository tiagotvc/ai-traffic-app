#!/usr/bin/env node
/**
 * Sobe o dev server (next dev -p 3008) + um túnel Cloudflare (quick tunnel,
 * efêmero) apontando pra ele, e já atualiza NEXTAUTH_URL/AUTH_URL no .env
 * com a URL nova do túnel antes de iniciar o Next — sem isso o NextAuth
 * assina cookies/callbacks com a URL antiga e login quebra atrás do túnel.
 *
 * Uso: node scripts/dev-tunnel.mjs
 */
import "dotenv/config";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3008;
const ENV_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");

function updateEnvUrl(url) {
  const raw = readFileSync(ENV_PATH, "utf8");
  const next = raw
    .replace(/^NEXTAUTH_URL=.*$/m, `NEXTAUTH_URL="${url}"`)
    .replace(/^AUTH_URL=.*$/m, `AUTH_URL="${url}"`);
  writeFileSync(ENV_PATH, next);
  console.log(`[dev-tunnel] .env atualizado: NEXTAUTH_URL/AUTH_URL = ${url}`);
}

function startTunnel() {
  return new Promise((resolve, reject) => {
    const proc = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${PORT}`], {
      shell: true
    });

    let resolved = false;
    const onData = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(`[cloudflared] ${text}`);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !resolved) {
        resolved = true;
        resolve({ url: match[0], proc });
      }
    };

    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("exit", (code) => {
      if (!resolved) reject(new Error(`cloudflared saiu antes de expor a URL (code ${code})`));
    });

    setTimeout(() => {
      if (!resolved) reject(new Error("Timeout esperando a URL do túnel Cloudflare"));
    }, 20000);
  });
}

/** Espera o Next responder de verdade antes de anunciar a URL — sem isso, quem
 * abre o link assim que o túnel fica no ar pode pegar o servidor ainda subindo
 * (primeira compilação do Turbopack) e ver um 404/erro transitório. */
async function waitForServer(timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`, { redirect: "manual" });
      if (res.status < 500) return true;
    } catch {
      /* servidor ainda não está escutando — tenta de novo */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function startNext(url) {
  // Passa a URL nova direto no env do processo filho — não basta reescrever o .env
  // no disco, porque este script já carregou o .env antigo em process.env via
  // "dotenv/config" no topo do arquivo, e o Next.js não sobrescreve uma env var
  // que já chega definida (herdada do processo pai) com o valor do arquivo .env.
  // Sem isso, cada execução ficava sempre uma rodada atrasada na URL do túnel.
  const proc = spawn("next", ["dev", "-p", String(PORT)], {
    shell: true,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXTAUTH_URL: url,
      AUTH_URL: url
    }
  });
  return proc;
}

async function main() {
  console.log("[dev-tunnel] abrindo túnel Cloudflare...");
  const { url, proc: tunnelProc } = await startTunnel();
  console.log(`[dev-tunnel] túnel pronto: ${url}`);

  updateEnvUrl(url);

  console.log("[dev-tunnel] subindo next dev...");
  const nextProc = startNext(url);

  const ready = await waitForServer();
  if (ready) {
    console.log(`\n[dev-tunnel] tudo pronto — acesse: ${url}\n`);
  } else {
    console.log(
      "\n[dev-tunnel] o Next demorou mais que o esperado pra responder — espere mais um pouco antes de acessar.\n"
    );
  }

  const shutdown = () => {
    tunnelProc.kill();
    nextProc.kill();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  nextProc.on("exit", (code) => {
    tunnelProc.kill();
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error("[dev-tunnel] falha:", err.message);
  process.exit(1);
});
