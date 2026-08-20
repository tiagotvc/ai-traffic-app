import "server-only";

import { SITE_URL } from "@/lib/seo";

export function escapeEmailHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!
  );
}

export function emailTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#cbd5e1;font-size:15px;line-height:1.65;">${escapeEmailHtml(paragraph).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}

export function renderBrandedEmail(input: {
  preheader?: string;
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  action?: { label: string; href: string };
  footer?: string;
}): string {
  const logoUrl = `${SITE_URL}/brand/white_logo.png`;
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(input.preheader)}</div>`
    : "";
  const eyebrow = input.eyebrow
    ? `<p style="margin:0 0 10px;color:#f59e0b;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">${escapeEmailHtml(input.eyebrow)}</p>`
    : "";
  const action = input.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="border-radius:10px;background:#f59e0b;"><a href="${escapeEmailHtml(input.action.href)}" style="display:inline-block;padding:13px 24px;color:#0a0f14;text-decoration:none;font-size:14px;font-weight:700;">${escapeEmailHtml(input.action.label)}</a></td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:0;background:#070b10;font-family:Arial,Helvetica,sans-serif;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070b10;padding:32px 16px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111823;border:1px solid #263244;border-radius:18px;overflow:hidden;">
      <tr><td style="height:4px;background:#f59e0b;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:8px 32px;border-bottom:1px solid #263244;"><img src="${escapeEmailHtml(logoUrl)}" width="320" alt="Orion Agency" style="display:block;width:320px;max-width:100%;height:auto;border:0;" /></td></tr>
      <tr><td style="padding:30px 32px 32px;">${eyebrow}<h1 style="margin:0 0 18px;color:#f8fafc;font-size:24px;line-height:1.3;font-weight:700;">${escapeEmailHtml(input.title)}</h1>${input.bodyHtml}${action}</td></tr>
      <tr><td style="padding:20px 32px;background:#0d141e;border-top:1px solid #263244;"><p style="margin:0;color:#718096;font-size:11px;line-height:1.6;">${escapeEmailHtml(input.footer ?? "Dúvidas? Responda este e-mail. A equipe Orion está por perto.")}</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
