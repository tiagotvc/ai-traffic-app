import { Column, Entity } from "typeorm";

import { AppBaseEntity } from "./_shared";

@Entity({ name: "video_upload_parts" })
export class VideoUploadPart extends AppBaseEntity {
  @Column({ type: "uuid" })
  sessionId!: string;

  @Column({ type: "int" })
  partIndex!: number;

  @Column({ type: "bytea" })
  data!: Buffer;
}
