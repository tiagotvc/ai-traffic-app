#!/usr/bin/env node
/**
 * Sync UX Pilot export → src/uxpilot-ui
 *
 * Usage:
 *   node scripts/sync-uxpilot.mjs
 *   UXPILOT_SRC=./uxpilot-v2/src node scripts/sync-uxpilot.mjs
 *
 * Preserves: src/uxpilot-ui/adapters/** (hand-maintained)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const UXPILOT_SRC = process.env.UXPILOT_SRC || path.join(ROOT, "uxpilot-v2", "src");
const DEST = path.join(ROOT, "src", "uxpilot-ui");
const ADAPTERS = path.join(DEST, "adapters");
const PRESERVE = new Set(["adapters", "lib"]);

const SKIP_FILES = new Set(["main.tsx", "App.tsx"]);
const SKIP_HOOKS = new Set(["use-toast.ts"]);
const CONTENT_PAGES = new Set([
  "Dashboard.tsx",
  "AgencyBrain.tsx",
  "Campaigns.tsx",
  "Alerts.tsx",
  "Audiences.tsx",
  "Creatives.tsx",
  "Reports.tsx",
  "Settings.tsx",
  "Support.tsx",
  "About.tsx",
  "Terms.tsx"
  // Clients.tsx — multi-return (list + wizard); NewCampaign.tsx — no <main>
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rmExceptPreserved(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (PRESERVE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) fs.rmSync(full, { recursive: true, force: true });
    else fs.unlinkSync(full);
  }
}

function needsUseClient(content) {
  return /useState|useEffect|useLayoutEffect|useRef|useCallback|useMemo|useReducer|useContext|useId|useSyncExternalStore|onClick|onChange|onSubmit|useNavigate|useLocation|useSearchParams/.test(
    content
  );
}

function transformSource(content, relPath) {
  let c = content;

  if (
    !c.startsWith('"use client"') &&
    !c.startsWith("'use client'") &&
    (relPath.startsWith("pages/") ||
      relPath.startsWith("components/") ||
      relPath.startsWith("hooks/")) &&
    needsUseClient(c)
  ) {
    c = `"use client";\n\n${c}`;
  }

  c = c.replace(
    /import\s+\{([^}]+)\}\s+from\s+["']react-router-dom["'];?\s*\n/g,
    (_, imports) => {
      const parts = imports.split(",").map((s) => s.trim()).filter(Boolean);
      const mapped = parts.map((part) => {
        const name = part.replace(/\s+as\s+.*/, "").trim();
        if (name === "useLocation") return "useUxLocation as useLocation";
        if (name === "useNavigate") return "useUxNavigate as useNavigate";
        return part;
      });
      return `import { ${mapped.join(", ")} } from "@/uxpilot-ui/adapters/navigation";\n`;
    }
  );

  c = c.replace(
    /import\s+\{\s*Link\s*\}\s+from\s+["']react-router-dom["'];?\s*\n/g,
    'import { Link } from "@/uxpilot-ui/adapters/navigation";\n'
  );

  c = c.replace(/from\s+["']@\/components\//g, 'from "@/uxpilot-ui/components/');
  c = c.replace(/from\s+["']@\/hooks\//g, 'from "@/uxpilot-ui/hooks/');
  c = c.replace(/from\s+["']@\/pages\//g, 'from "@/uxpilot-ui/pages/');
  c = c.replace(/from\s+["']@\/lib\/utils["']/g, 'from "@/uxpilot-ui/lib/utils"');

  if (relPath === "hooks/useTheme.tsx") {
    c = c.replace(
      /const \[theme, setTheme\] = useState<Theme>\(\(\) => \{\s*return \(localStorage\.getItem\("ai-traffic-theme"\) as Theme\) \|\| "dark";\s*\}\);/,
      `const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("ai-traffic-theme") as Theme | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);`
    );
  }

  return c;
}

function removeShellImports(content) {
  return content
    .replace(/import Sidebar from[^\n]+\n/g, "")
    .replace(/import CommandStrip from[^\n]+\n/g, "");
}

function patchDashboardCommandStrip(header) {
  let h = header.replace(
    /const \[isEmptyState, setIsEmptyState\] = useState\(false\);/,
    "const { isEmptyState, setIsEmptyState } = useUxCommandStrip();"
  );
  if (!h.includes('CommandStripBridge')) {
    h = h.replace(
      /import \{ useState \} from "react";/,
      'import { useState } from "react";\nimport { useUxCommandStrip } from "@/uxpilot-ui/adapters/CommandStripBridge";'
    );
  }
  return h;
}

function extractMainBlock(content) {
  const fnMatch = content.match(/export default function \w+\(\) \{/);
  if (!fnMatch || fnMatch.index === undefined) return null;

  const returnIdx = content.indexOf("return (", fnMatch.index);
  if (returnIdx < 0) return null;

  const mainStart = content.indexOf("<main", returnIdx);
  if (mainStart < 0) return null;

  const mainEnd = content.indexOf("</main>", mainStart);
  if (mainEnd < 0) return null;

  return content.slice(mainStart, mainEnd + "</main>".length);
}

function extractNewCampaignInner(content) {
  const fnMatch = content.match(/export default function \w+\(\) \{/);
  if (!fnMatch || fnMatch.index === undefined) return null;

  const returnIdx = content.indexOf("return (", fnMatch.index);
  if (returnIdx < 0) return null;

  const marker = '<div className="flex-1 flex flex-col overflow-hidden min-w-0">';
  const innerStart = content.indexOf(marker, returnIdx);
  if (innerStart < 0) return null;

  let depth = 0;
  let i = innerStart;
  for (; i < content.length; i++) {
    if (content.startsWith("<div", i)) {
      depth++;
      i += 3;
      continue;
    }
    if (content.startsWith("</div>", i)) {
      depth--;
      if (depth === 0) {
        return content.slice(innerStart, i + "</div>".length);
      }
      i += 5;
      continue;
    }
  }
  return null;
}

function findFunctionEnd(content, openBraceIdx) {
  let depth = 0;
  for (let i = openBraceIdx; i < content.length; i++) {
    if (content[i] === "{") depth++;
    if (content[i] === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return content.length;
}

function stripSimplePage(content, exportName, fileName) {
  let c = removeShellImports(content);
  const fnMatch = c.match(/export default function \w+\(\) \{/);
  if (!fnMatch || fnMatch.index === undefined) {
    console.warn(`[sync-uxpilot] No default export for ${exportName}`);
    return c;
  }

  const fnStart = fnMatch.index;
  const mainBlock = extractMainBlock(c);
  if (!mainBlock) {
    console.warn(`[sync-uxpilot] No <main> found for ${exportName}`);
    return c;
  }

  const returnIdx = c.indexOf("return (", fnStart);
  const openBrace = c.indexOf("{", fnStart);
  const fnEnd = findFunctionEnd(c, openBrace);
  const afterExport = c.slice(fnEnd).trimStart();

  let header = c.slice(0, returnIdx).replace(/export default function \w+/, `export default function ${exportName}`);
  if (fileName === "Dashboard.tsx") {
    header = patchDashboardCommandStrip(header);
  }

  const tail = afterExport ? `\n\n${afterExport}` : "";
  return `${header}return (\n    ${mainBlock}\n  );\n}${tail}\n`;
}

function stripNewCampaignPage(content, exportName) {
  let c = removeShellImports(content);
  const splitMarker = "\n/* ── Helper sub-components ──";
  const splitIdx = c.indexOf(splitMarker);
  const mainPart = splitIdx >= 0 ? c.slice(0, splitIdx) : c;
  const helpers = splitIdx >= 0 ? c.slice(splitIdx + 1) : "";

  const innerBlock = extractNewCampaignInner(mainPart);
  if (!innerBlock) {
    console.warn(`[sync-uxpilot] No inner content found for ${exportName}`);
    return c;
  }

  const fnMatch = mainPart.match(/export default function \w+\(\) \{/);
  const beforeReturn = mainPart.slice(0, mainPart.indexOf("return (", fnMatch?.index ?? 0));
  const header = beforeReturn.replace(/export default function \w+/, `export default function ${exportName}`);

  return `${header}return (\n    ${innerBlock}\n  );\n}\n\n${helpers}`;
}

function stripAgencyBrainPage(content, exportName) {
  let c = removeShellImports(content);
  const splitMarker = "\n/* ─── Hypotheses";
  const splitIdx = c.indexOf(splitMarker);
  const mainPart = splitIdx >= 0 ? c.slice(0, splitIdx) : c;
  const helpers = splitIdx >= 0 ? c.slice(splitIdx + 1) : "";

  const mainBlock = extractMainBlock(mainPart);
  if (!mainBlock) {
    console.warn(`[sync-uxpilot] No <main> found for ${exportName}`);
    return c;
  }

  const fnMatch = mainPart.match(/export default function \w+\(\) \{/);
  const returnIdx = mainPart.indexOf("return (", fnMatch?.index ?? 0);
  const afterMain = mainPart.slice(mainPart.indexOf("</main>", returnIdx) + "</main>".length);
  const timelineMatch = afterMain.match(/\{timelineItem && \(\s*<TimelinePanel[\s\S]*?\/>\s*\)\}\s*/);

  const beforeReturn = mainPart.slice(0, returnIdx);
  const header = beforeReturn.replace(/export default function \w+/, `export default function ${exportName}`);

  const timeline = timelineMatch ? `\n      ${timelineMatch[0].trim()}` : "";

  return `${header}return (\n    <>\n      ${mainBlock}${timeline}\n    </>\n  );\n}\n\n${helpers}`;
}

function stripPageShell(content, fileName) {
  const exportName = fileName.replace(".tsx", "Content");
  if (fileName === "AgencyBrain.tsx") return stripAgencyBrainPage(content, exportName);
  if (fileName === "NewCampaign.tsx") return stripNewCampaignPage(content, exportName);
  return stripSimplePage(content, exportName, fileName);
}

function copyTree(srcDir, destDir, rel = "") {
  ensureDir(destDir);
  let count = 0;

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (entry.name === "ui") continue;

    const srcPath = path.join(srcDir, entry.name);
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      count += copyTree(srcPath, path.join(destDir, entry.name), relPath);
      continue;
    }

    if (!entry.name.endsWith(".tsx") && !entry.name.endsWith(".ts")) continue;
    if (SKIP_FILES.has(entry.name)) continue;
    if (relPath.startsWith("hooks/") && SKIP_HOOKS.has(entry.name)) continue;

    const raw = fs.readFileSync(srcPath, "utf8");
    const transformed = transformSource(raw, relPath);
    fs.writeFileSync(path.join(destDir, entry.name), transformed, "utf8");
    count++;

    if (CONTENT_PAGES.has(entry.name)) {
      const stripped = stripPageShell(transformed, entry.name);
      const contentDir = path.join(DEST, "pages", "content");
      ensureDir(contentDir);
      fs.writeFileSync(path.join(contentDir, entry.name), stripped, "utf8");
      count++;
    }
  }

  return count;
}

function extractStyles(indexCss) {
  const start = indexCss.indexOf("@layer utilities");
  if (start < 0) {
    return "/* UX Pilot utility layers — run sync:uxpilot after export update */\n";
  }

  let depth = 0;
  let body = "";
  for (let i = start; i < indexCss.length; i++) {
    const ch = indexCss[i];
    if (ch === "{") {
      depth++;
      if (depth === 1) continue;
    }
    if (ch === "}") {
      depth--;
      if (depth === 0) break;
    }
    if (depth >= 1) body += ch;
  }

  return `/* AUTO-GENERATED from UX Pilot index.css — do not edit */\n${body.trim()}\n`;
}

function writeManifest(fileCount) {
  const manifest = {
    syncedAt: new Date().toISOString(),
    source: path.relative(ROOT, UXPILOT_SRC),
    fileCount,
    contentPages: [...CONTENT_PAGES]
  };
  fs.writeFileSync(path.join(DEST, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function main() {
  if (!fs.existsSync(UXPILOT_SRC)) {
    console.error(`[sync-uxpilot] Source not found: ${UXPILOT_SRC}`);
    console.error("Extract UX Pilot zip to uxpilot-v2/ or set UXPILOT_SRC.");
    process.exit(1);
  }

  ensureDir(DEST);
  rmExceptPreserved(DEST);

  const fileCount = copyTree(UXPILOT_SRC, DEST);

  const indexCss = path.join(UXPILOT_SRC, "index.css");
  if (fs.existsSync(indexCss)) {
    fs.writeFileSync(path.join(DEST, "styles.css"), extractStyles(fs.readFileSync(indexCss, "utf8")), "utf8");
  }

  writeManifest(fileCount);

  console.log(`[sync-uxpilot] Synced ${fileCount} files from ${path.relative(ROOT, UXPILOT_SRC)}`);
  console.log(`[sync-uxpilot] Output: ${path.relative(ROOT, DEST)}`);
  console.log("[sync-uxpilot] Adapters preserved in src/uxpilot-ui/adapters/");
}

main();
