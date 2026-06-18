import "server-only";

import { randomUUID } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

import { MAX_CREATIVE_VIDEO_BYTES, VIDEO_UPLOAD_CHUNK_BYTES } from "@/lib/creative-upload-limits";

const SESSION_TTL_MS = 30 * 60 * 1000;
const UPLOAD_ROOT = join(tmpdir(), "ai-traffic-video-upload");

export type VideoUploadSession = {
  uploadId: string;
  tenantId: string;
  clientId: string;
  adAccountId: string;
  label: string;
  fileName: string;
  totalSize: number;
  totalChunks: number;
  receivedParts: number[];
  dir: string;
  createdAt: number;
};

type Manifest = Omit<VideoUploadSession, "receivedParts"> & { receivedParts: number[] };

async function pruneSessions() {
  const { readdir } = await import("fs/promises");
  let entries: string[] = [];
  try {
    entries = await readdir(UPLOAD_ROOT);
  } catch {
    return;
  }

  const now = Date.now();
  await Promise.all(
    entries.map(async (uploadId) => {
      const session = await loadVideoUploadSession(uploadId);
      if (!session || now - session.createdAt > SESSION_TTL_MS) {
        await rm(join(UPLOAD_ROOT, uploadId), { recursive: true, force: true }).catch(() => undefined);
      }
    })
  );
}

async function saveManifest(session: VideoUploadSession) {
  const manifest: Manifest = {
    uploadId: session.uploadId,
    tenantId: session.tenantId,
    clientId: session.clientId,
    adAccountId: session.adAccountId,
    label: session.label,
    fileName: session.fileName,
    totalSize: session.totalSize,
    totalChunks: session.totalChunks,
    receivedParts: session.receivedParts,
    dir: session.dir,
    createdAt: session.createdAt
  };
  await writeFile(join(session.dir, "manifest.json"), JSON.stringify(manifest));
}

export async function loadVideoUploadSession(uploadId: string): Promise<VideoUploadSession | null> {
  try {
    const raw = await readFile(join(UPLOAD_ROOT, uploadId, "manifest.json"), "utf8");
    const manifest = JSON.parse(raw) as Manifest;
    return {
      ...manifest,
      receivedParts: [...manifest.receivedParts]
    };
  } catch {
    return null;
  }
}

export async function createVideoUploadSession(input: {
  tenantId: string;
  clientId: string;
  adAccountId: string;
  label: string;
  fileName: string;
  totalSize: number;
  totalChunks: number;
}): Promise<VideoUploadSession> {
  await pruneSessions();

  if (input.totalSize <= 0 || input.totalSize > MAX_CREATIVE_VIDEO_BYTES) {
    throw new Error("Vídeo muito grande (máx. 100 MB)");
  }
  if (input.totalChunks < 1 || input.totalChunks > Math.ceil(MAX_CREATIVE_VIDEO_BYTES / VIDEO_UPLOAD_CHUNK_BYTES)) {
    throw new Error("Upload inválido");
  }

  const uploadId = randomUUID();
  const dir = join(UPLOAD_ROOT, uploadId);
  await mkdir(dir, { recursive: true });

  const session: VideoUploadSession = {
    uploadId,
    tenantId: input.tenantId,
    clientId: input.clientId,
    adAccountId: input.adAccountId,
    label: input.label,
    fileName: input.fileName,
    totalSize: input.totalSize,
    totalChunks: input.totalChunks,
    receivedParts: [],
    dir,
    createdAt: Date.now()
  };
  await saveManifest(session);
  return session;
}

export function getVideoUploadSession(uploadId: string) {
  return loadVideoUploadSession(uploadId);
}

export async function saveVideoUploadPart(
  session: VideoUploadSession,
  partIndex: number,
  chunk: Buffer
): Promise<VideoUploadSession> {
  if (partIndex < 0 || partIndex >= session.totalChunks) {
    throw new Error("Parte inválida");
  }
  if (chunk.length === 0) {
    throw new Error("Parte vazia");
  }
  if (chunk.length > VIDEO_UPLOAD_CHUNK_BYTES + 512 * 1024) {
    throw new Error("Parte grande demais");
  }

  await writeFile(join(session.dir, `part-${partIndex}`), chunk);
  if (!session.receivedParts.includes(partIndex)) {
    session.receivedParts.push(partIndex);
    session.receivedParts.sort((a, b) => a - b);
    await saveManifest(session);
  }
  return session;
}

export async function readAssembledVideo(session: VideoUploadSession): Promise<Buffer> {
  if (session.receivedParts.length !== session.totalChunks) {
    throw new Error("Upload incompleto");
  }

  const parts: Buffer[] = [];
  let total = 0;
  for (let i = 0; i < session.totalChunks; i++) {
    if (!session.receivedParts.includes(i)) {
      throw new Error(`Parte ${i} ausente`);
    }
    const data = await readFile(join(session.dir, `part-${i}`));
    total += data.length;
    parts.push(data);
  }

  if (total !== session.totalSize) {
    throw new Error("Tamanho do arquivo não confere");
  }

  return Buffer.concat(parts);
}

export async function destroyVideoUploadSession(uploadId: string) {
  await rm(join(UPLOAD_ROOT, uploadId), { recursive: true, force: true }).catch(() => undefined);
}
