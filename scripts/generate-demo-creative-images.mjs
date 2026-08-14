import { mkdirSync, writeFileSync, readdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { CLIENTS, slug } from "./seed-demo-agency-clients.mjs";

/**
 * Gera um preview SVG para cada criativo das contas demo.
 * Os arquivos ficam em `public/demo-creatives/` e são servidos sem passar pelo
 * middleware de autenticação (o matcher exclui `.svg`), então funcionam tanto na
 * tela de ranking quanto dentro do PDF renderizado pelo Puppeteer.
 *
 * Uso: node scripts/generate-demo-creative-images.mjs
 */

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "demo-creatives");

const WIDTH = 1200;
const HEIGHT = 900;

/** Paleta sóbria; o tom sai do hash do nome, então é estável entre execuções. */
const PALETTES = [
  ["#1e293b", "#0f172a", "#38bdf8"],
  ["#312e29", "#1c1917", "#f59e0b"],
  ["#1e1b4b", "#0f0d2e", "#818cf8"],
  ["#14342b", "#0b201a", "#34d399"],
  ["#3b1d2e", "#22101b", "#fb7185"],
  ["#1c2b3a", "#0d1622", "#60a5fa"],
  ["#2d2438", "#180f21", "#c084fc"],
  ["#33241c", "#1c120c", "#fb923c"]
];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const VIDEO_HINTS = /\b(video|v[ií]deo|reels?|stories?|story)\b/i;
const CAROUSEL_HINTS = /\b(carrossel|carousel|din[âa]mico)\b/i;

function formatOf(name) {
  if (VIDEO_HINTS.test(name)) return "VÍDEO";
  if (CAROUSEL_HINTS.test(name)) return "CARROSSEL";
  return "IMAGEM";
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Quebra o nome em linhas curtas para caber no card. */
function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function buildSvg(name) {
  const h = hash(name);
  const [from, to, accent] = PALETTES[h % PALETTES.length];
  const angle = (h % 40) - 20;
  const format = formatOf(name);
  // O rótulo mostra só a parte descritiva; o formato já vai no selo.
  const label = name.split("|")[0].trim() || name;
  const lines = wrap(label, 18);
  const fontSize = lines.length > 2 ? 68 : 82;
  const blockHeight = lines.length * (fontSize + 14);
  const firstY = HEIGHT / 2 - blockHeight / 2 + fontSize;

  const rings = [0, 1, 2]
    .map((i) => {
      const r = 260 + i * 130;
      return `<circle cx="${WIDTH - 180}" cy="${HEIGHT + 60}" r="${r}" fill="none" stroke="${accent}" stroke-opacity="${0.16 - i * 0.04}" stroke-width="2" />`;
    })
    .join("");

  const textLines = lines
    .map(
      (l, i) =>
        `<text x="90" y="${firstY + i * (fontSize + 14)}" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="700" fill="#f8fafc" letter-spacing="-1.5">${escapeXml(l)}</text>`
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="${escapeXml(name)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />
  ${rings}
  <rect x="90" y="80" width="${18 + format.length * 19}" height="52" rx="26" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-opacity="0.5" stroke-width="2" />
  <text x="${104}" y="115" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="26" font-weight="600" fill="${accent}" letter-spacing="2">${format}</text>
  ${textLines}
  <rect x="90" y="${HEIGHT - 130}" width="120" height="6" rx="3" fill="${accent}" />
  <text x="90" y="${HEIGHT - 80}" font-family="Inter, Segoe UI, Helvetica, Arial, sans-serif" font-size="28" font-weight="500" fill="#cbd5e1" fill-opacity="0.75">Criativo de demonstração</text>
</svg>
`;
}

function main() {
  const names = new Set();
  for (const client of CLIENTS) {
    for (const campaign of client.campaigns) {
      for (const creative of campaign.creatives) names.add(creative.name);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });

  // Remove previews órfãos de execuções anteriores.
  const expected = new Set([...names].map((n) => `${slug(n)}.svg`));
  for (const file of readdirSync(OUT_DIR)) {
    if (file.endsWith(".svg") && !expected.has(file)) rmSync(join(OUT_DIR, file));
  }

  for (const name of names) {
    writeFileSync(join(OUT_DIR, `${slug(name)}.svg`), buildSvg(name), "utf8");
  }

  console.log(`${names.size} previews gerados em public/demo-creatives/`);
}

main();
