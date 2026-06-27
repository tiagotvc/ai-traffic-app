/** pdf-lib StandardFonts use WinAnsi — normalize Unicode to safe characters. */
export function sanitizePdfText(text: string): string {
  return text
    .replace(/\u2192/g, " a ")
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\t\n\r\u0020-\u00FF]/g, "");
}

export function truncatePdfText(text: string, maxChars: number): string {
  const safe = sanitizePdfText(text);
  if (safe.length <= maxChars) return safe;
  return `${safe.slice(0, Math.max(0, maxChars - 3))}...`;
}

/** Split text into lines that fit within maxWidth (measured with widthOfTextAtSize). */
export function wrapPdfText(
  text: string,
  maxWidth: number,
  widthOfText: (line: string) => number,
  maxLines = 2
): string[] {
  const safe = sanitizePdfText(text).trim();
  if (!safe) return [""];
  if (widthOfText(safe) <= maxWidth) return [safe];

  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (widthOfText(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    if (widthOfText(word) > maxWidth) {
      let chunk = "";
      for (const ch of word) {
        const next = chunk + ch;
        if (widthOfText(next) > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
          if (lines.length >= maxLines) break;
        } else {
          chunk = next;
        }
      }
      current = lines.length >= maxLines ? "" : chunk;
    } else {
      current = word;
    }
    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length > maxLines) return lines.slice(0, maxLines);
  return lines.length ? lines : [safe.slice(0, 1)];
}
