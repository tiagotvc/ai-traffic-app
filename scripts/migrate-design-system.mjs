/**
 * Bulk-migrate legacy Tailwind classes to Traffic AI design system tokens.
 * Run: node scripts/migrate-design-system.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src");
const EXT = new Set([".tsx", ".ts"]);

/** @type {Array<[RegExp, string]>} */
const REPLACEMENTS = [
  [/rounded-2xl border border-slate-200\/80 bg-white shadow-sm/g, "ui-card"],
  [/rounded-xl border border-slate-200 bg-white shadow-sm/g, "ui-card"],
  [/rounded-2xl border border-slate-200 bg-white shadow-sm/g, "ui-card"],
  [/rounded-xl border border-slate-200 bg-white/g, "ui-card"],
  [/rounded-2xl border border-slate-200 bg-white/g, "ui-card"],
  [/rounded-lg border border-slate-200 bg-white/g, "ui-card"],
  [
    /text-2xl font-bold tracking-tight text-\[var\(--text-main\)\]/g,
    "font-heading text-2xl font-bold tracking-tight text-[var(--text-main)]"
  ],
  [/text-2xl font-bold tracking-tight text-slate-900/g, "font-heading text-2xl font-bold tracking-tight text-[var(--text-main)]"],
  [/text-xl font-bold tracking-tight text-slate-900/g, "font-heading text-xl font-bold tracking-tight text-[var(--text-main)]"],
  [/text-lg font-bold tracking-tight text-slate-900/g, "font-heading text-lg font-bold tracking-tight text-[var(--text-main)]"],
  [/text-lg font-bold text-slate-900/g, "font-heading text-lg font-bold text-[var(--text-main)]"],
  [/text-sm font-semibold text-violet-600 hover:text-violet-500/g, "ui-link text-sm"],
  [/text-xs font-semibold text-violet-600 hover:text-violet-500/g, "ui-link text-xs"],
  [/text-violet-600 hover:text-violet-500/g, "ui-link"],
  [/text-violet-700 hover:text-violet-600/g, "ui-link"],
  [/text-violet-800/g, "text-[var(--violet)]"],
  [/text-violet-900/g, "text-[var(--violet)]"],
  [/text-slate-900/g, "text-[var(--text-main)]"],
  [/text-slate-800/g, "text-[var(--text-main)]"],
  [/text-slate-700/g, "text-[var(--text-dim)]"],
  [/text-slate-600/g, "text-[var(--text-dim)]"],
  [/text-slate-500/g, "text-[var(--text-dim)]"],
  [/text-slate-400/g, "text-[var(--text-dimmer)]"],
  [/border-slate-200\/80/g, "border-[var(--border-color)]"],
  [/border-slate-200/g, "border-[var(--border-color)]"],
  [/border-slate-100/g, "border-[var(--border-color)]"],
  [/divide-slate-100/g, "divide-[var(--border-color)]"],
  [/divide-slate-200/g, "divide-[var(--border-color)]"],
  [/bg-slate-50/g, "bg-[var(--surface-thead)]"],
  [/hover:bg-slate-50/g, "hover:bg-[var(--row-hover)]"],
  [/hover:bg-slate-100/g, "hover:bg-[var(--row-hover)]"],
  [/bg-\[#f4f6f9\]/g, "bg-[var(--surface-bg)]"],
  [/bg-\[#0f111a\]/g, "bg-[var(--sidebar-bg)]"],
  [/border-violet-600 text-violet-700/g, "border-[var(--amber-bright)] text-[var(--amber)]"],
  [/border-violet-600 text-violet-600/g, "border-[var(--amber-bright)] text-[var(--amber)]"],
  [/border-b-2 border-violet-600/g, "border-b-2 border-[var(--amber-bright)]"],
  [/border-violet-600/g, "border-[var(--violet)]"],
  [/bg-violet-100/g, "bg-[rgba(124,58,237,0.1)]"],
  [/bg-violet-50/g, "bg-[rgba(124,58,237,0.06)]"],
  [/border-violet-200/g, "border-[rgba(124,58,237,0.2)]"],
  [/border-violet-100/g, "border-[rgba(124,58,237,0.15)]"],
  [/rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500/g, "ui-btn-primary"],
  [/rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700/g, "ui-btn-primary"],
  [/rounded-xl bg-violet-600 px-5 py-2\.5 text-sm font-semibold text-white hover:bg-violet-500/g, "ui-btn-primary"],
  [/rounded-lg bg-violet-600 px-3 py-1\.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500/g, "ui-btn-primary text-xs"],
  [/rounded-lg bg-violet-600 px-3 py-1\.5 text-xs font-semibold text-white hover:bg-violet-500/g, "ui-btn-primary text-xs"],
  [/rounded-lg bg-violet-600 px-3 py-1\.5 text-xs font-semibold text-white hover:bg-violet-700/g, "ui-btn-primary text-xs"],
  [/rounded-lg bg-violet-600 px-4 py-1\.5 text-xs font-semibold text-white/g, "ui-btn-primary text-xs"],
  [/rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500/g, "ui-btn-primary text-xs"],
  [/inline-flex rounded-xl bg-violet-600 px-5 py-2\.5 text-sm font-semibold text-white hover:bg-violet-500/g, "ui-btn-primary"],
  [/inline-flex items-center rounded-lg bg-violet-600 px-2\.5 py-1\.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-50/g, "ui-btn-brand text-xs disabled:opacity-50"],
  [/rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-60/g, "ui-btn-primary text-xs disabled:opacity-60"],
  [/w-full rounded-xl bg-violet-600 py-4 text-base font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-60/g, "ui-btn-primary w-full py-4 text-base font-bold disabled:opacity-60"],
  [/rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60/g, "ui-btn-primary disabled:opacity-60"],
  [/rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500/g, "ui-btn-primary"],
  [/rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50/g, "ui-btn-secondary"],
  [/rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-\[var\(--text-dim\)\] shadow-sm transition hover:bg-slate-50/g, "ui-btn-secondary"],
  [/rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-\[var\(--text-dim\)\] shadow-sm transition hover:bg-slate-50/g, "ui-btn-secondary text-sm"],
  [/rounded-lg bg-violet-600 px-2 py-1\.5 text-xs font-medium text-white hover:bg-violet-700/g, "ui-btn-primary text-xs"],
  [/rounded-2xl border border-rose-200 bg-rose-50 p-4/g, "ui-alert-danger p-4"],
  [/rounded-2xl border border-violet-200 bg-violet-50 p-4/g, "ui-alert-info p-4"],
  [/rounded-xl border border-amber-200 bg-amber-50/g, "ui-alert-warning"],
  [/rounded-xl border border-rose-200 bg-rose-50/g, "ui-alert-danger"],
  [/bg-emerald-50 text-emerald-700/g, "bg-[rgba(16,185,129,0.12)] text-[var(--success)]"],
  [/bg-rose-50 text-rose-700/g, "bg-[rgba(239,68,68,0.12)] text-[var(--danger)]"],
  [/bg-amber-50 text-amber-800/g, "bg-[rgba(245,166,35,0.12)] text-[var(--amber)]"],
  [/hover:bg-violet-700/g, "hover:brightness-105"],
  [/hover:bg-violet-500/g, "hover:brightness-105"]
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === "uxpilot-export") continue;
      walk(full, files);
    } else if (EXT.has(path.extname(name))) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  for (const [re, rep] of REPLACEMENTS) {
    content = content.replace(re, rep);
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    changed++;
    console.log("updated:", path.relative(process.cwd(), file));
  }
}
console.log(`\nDone. ${changed} files updated.`);
