// Roda as migrações do banco automaticamente APENAS durante o build no Vercel.
// Em builds locais (sem a env VERCEL) não faz nada, para não tocar no banco por engano.
// Cobre os dois modos de build do Vercel: como `prebuild` (antes de `build`) e
// dentro de `vercel-build`.
import { execSync } from "node:child_process";

if (process.env.VERCEL) {
  console.log("[migrate-vercel] Vercel detectado — aplicando migrações pendentes...");
  execSync("tsx src/db/run-migrations.ts", { stdio: "inherit" });
} else {
  console.log("[migrate-vercel] Fora do Vercel — pulando migrações.");
}
