import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type CreativeLibraryVisibility = "private" | "community";

/**
 * Toda variação gerada pelo Estúdio Criativo (usada ou não) — histórico privado por
 * tenant, com opção de compartilhar publicamente pra outras agências reusarem (biblioteca
 * comunitária). `sourceItemId` guarda proveniência quando o item nasceu do reuso de um
 * item comunitário de outro tenant — base pro futuro crédito de recompensa por reuso real
 * em campanha publicada (ainda não implementado, isso aqui só rastreia a origem).
 */
@Entity({ name: "creative_library_items" })
@Index(["tenantId", "createdAt"])
@Index(["visibility", "createdAt"])
export class CreativeLibraryItem extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  clientId?: string | null;

  @Column({ type: "uuid", nullable: true })
  createdByUserId?: string | null;

  @Column({ type: "text" })
  headline!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "text" })
  format!: string;

  @Column({ type: "text" })
  style!: string;

  @Column({ type: "text" })
  mimeType!: string;

  @Column({ type: "bytea" })
  imageData!: Buffer;

  @Column({ type: "text", default: "private" })
  visibility!: CreativeLibraryVisibility;

  @Column({ type: "timestamptz", nullable: true })
  sharedAt?: Date | null;

  /** Se este item nasceu de um "Usar" de um item comunitário de OUTRO tenant. */
  @Column({ type: "uuid", nullable: true })
  sourceItemId?: string | null;

  /** Preenchido quando este item virou um anúncio real (draft do Criador). */
  @Column({ type: "uuid", nullable: true })
  usedInDraftId?: string | null;
}
