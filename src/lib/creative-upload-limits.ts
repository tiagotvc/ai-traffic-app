/** Max video size accepted by `/api/creative-assets/video` (must match route handler). */
export const MAX_CREATIVE_VIDEO_BYTES = 100 * 1024 * 1024;

/** Max image size accepted by `/api/creative-assets/image` (Meta hard limit is 30 MB). */
export const MAX_CREATIVE_IMAGE_BYTES = 30 * 1024 * 1024;

/** Chunk size for multipart upload — stays under typical proxy/server body limits (~4–5 MB). */
export const VIDEO_UPLOAD_CHUNK_BYTES = 2 * 1024 * 1024;
