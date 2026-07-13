/**
 * Converte um arquivo de imagem em um data URI redimensionado no navegador.
 *
 * Não há blob storage no projeto — o logo do workspace é guardado como data URI
 * em `tenant.logoUrl` (coluna text). Por isso redimensionamos no cliente para caber
 * em `maxSize`px (mantendo proporção) e exportamos em WebP (com alpha, bem mais leve
 * que PNG) para economizar armazenamento. Navegadores sem WebP caem em PNG.
 *
 * Browser-only: usa FileReader/Image/canvas. Chame apenas em componentes client.
 */

/** ~370 KB de imagem em base64. Cap apertado: logos redimensionados ficam bem abaixo. */
export const MAX_LOGO_DATA_URL_LENGTH = 500_000;

export type LogoImageErrorCode =
  | "invalid_type"
  | "read_failed"
  | "decode_failed"
  | "canvas_unavailable"
  | "too_large";

export class LogoImageError extends Error {
  code: LogoImageErrorCode;
  constructor(code: LogoImageErrorCode) {
    super(code);
    this.code = code;
    this.name = "LogoImageError";
  }
}

export async function fileToResizedDataUrl(file: File, maxSize = 192): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new LogoImageError("invalid_type");
  }

  const sourceDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new LogoImageError("read_failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new LogoImageError("decode_failed"));
    image.src = sourceDataUrl;
  });

  const naturalMax = Math.max(img.width, img.height) || maxSize;
  const scale = Math.min(1, maxSize / naturalMax);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new LogoImageError("canvas_unavailable");
  ctx.drawImage(img, 0, 0, w, h);

  // WebP (com alpha) para economizar armazenamento; PNG como fallback se não suportado.
  let out = canvas.toDataURL("image/webp", 0.82);
  if (!out.startsWith("data:image/webp")) {
    out = canvas.toDataURL("image/png");
  }
  if (out.length > MAX_LOGO_DATA_URL_LENGTH) {
    throw new LogoImageError("too_large");
  }
  return out;
}
