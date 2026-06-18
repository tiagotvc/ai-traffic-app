import { Column, Entity } from "typeorm";

import { AppBaseEntity } from "./_shared";

@Entity({ name: "video_upload_sessions" })
export class VideoUploadSession extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "text" })
  clientSlug!: string;

  @Column({ type: "text" })
  adAccountId!: string;

  @Column({ type: "text" })
  label!: string;

  @Column({ type: "text" })
  fileName!: string;

  @Column({ type: "int" })
  totalSize!: number;

  @Column({ type: "int" })
  totalChunks!: number;

  @Column({ type: "jsonb", default: [] })
  receivedParts!: number[];
}
