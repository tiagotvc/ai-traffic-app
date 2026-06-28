"use client";

/** Trigger a file download in the browser; delay revoke so the download is not cancelled. */
export function downloadBytes(bytes: Uint8Array, filename: string, mimeType: string) {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
