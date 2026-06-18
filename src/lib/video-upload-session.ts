import "server-only";

import { LessThan } from "typeorm";

import { repositories } from "@/db/repositories";
import { MAX_CREATIVE_VIDEO_BYTES, VIDEO_UPLOAD_CHUNK_BYTES } from "@/lib/creative-upload-limits";

const SESSION_TTL_MS = 30 * 60 * 1000;

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
  createdAt: number;
};

function toSession(row: {
  id: string;
  tenantId: string;
  clientSlug: string;
  adAccountId: string;
  label: string;
  fileName: string;
  totalSize: number;
  totalChunks: number;
  receivedParts: number[];
  createdAt: Date;
}): VideoUploadSession {
  return {
    uploadId: row.id,
    tenantId: row.tenantId,
    clientId: row.clientSlug,
    adAccountId: row.adAccountId,
    label: row.label,
    fileName: row.fileName,
    totalSize: row.totalSize,
    totalChunks: row.totalChunks,
    receivedParts: [...(row.receivedParts ?? [])],
    createdAt: row.createdAt.getTime()
  };
}

async function pruneSessions() {
  const cutoff = new Date(Date.now() - SESSION_TTL_MS);
  const { videoUploadSession: repo } = await repositories();
  await repo.delete({ createdAt: LessThan(cutoff) });
}

export async function loadVideoUploadSession(uploadId: string): Promise<VideoUploadSession | null> {
  await pruneSessions();
  const { videoUploadSession: repo } = await repositories();
  const row = await repo.findOne({ where: { id: uploadId } });
  if (!row) return null;
  if (Date.now() - row.createdAt.getTime() > SESSION_TTL_MS) {
    await destroyVideoUploadSession(uploadId);
    return null;
  }
  return toSession(row);
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

  const { videoUploadSession: repo } = await repositories();
  const row = await repo.save(
    repo.create({
      tenantId: input.tenantId,
      clientSlug: input.clientId,
      adAccountId: input.adAccountId,
      label: input.label,
      fileName: input.fileName,
      totalSize: input.totalSize,
      totalChunks: input.totalChunks,
      receivedParts: []
    })
  );
  return toSession(row);
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

  const { videoUploadSession: sessionRepo, videoUploadPart: partRepo } = await repositories();

  const existing = await partRepo.findOne({
    where: { sessionId: session.uploadId, partIndex }
  });
  if (existing) {
    existing.data = chunk;
    await partRepo.save(existing);
  } else {
    await partRepo.save(
      partRepo.create({
        sessionId: session.uploadId,
        partIndex,
        data: chunk
      })
    );
  }

  const receivedParts = session.receivedParts.includes(partIndex)
    ? session.receivedParts
    : [...session.receivedParts, partIndex].sort((a, b) => a - b);

  await sessionRepo.update(session.uploadId, { receivedParts });

  return { ...session, receivedParts };
}

export async function readAssembledVideo(session: VideoUploadSession): Promise<Buffer> {
  if (session.receivedParts.length !== session.totalChunks) {
    throw new Error("Upload incompleto");
  }

  const { videoUploadPart: partRepo } = await repositories();
  const parts = await partRepo.find({
    where: { sessionId: session.uploadId },
    order: { partIndex: "ASC" }
  });

  if (parts.length !== session.totalChunks) {
    throw new Error("Upload incompleto");
  }

  const buffers: Buffer[] = [];
  let total = 0;
  for (let i = 0; i < session.totalChunks; i++) {
    const part = parts.find((p) => p.partIndex === i);
    if (!part) throw new Error(`Parte ${i} ausente`);
    total += part.data.length;
    buffers.push(part.data);
  }

  if (total !== session.totalSize) {
    throw new Error("Tamanho do arquivo não confere");
  }

  return Buffer.concat(buffers);
}

export async function destroyVideoUploadSession(uploadId: string) {
  const { videoUploadSession: repo } = await repositories();
  await repo.delete({ id: uploadId });
}
