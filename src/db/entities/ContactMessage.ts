import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type ContactMessageStatus = "new" | "read";

/** Mensagens enviadas pelos formulários de contato (in-app e site público). */
@Entity({ name: "contact_messages" })
export class ContactMessage extends AppBaseEntity {
  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  email!: string;

  @Column({ type: "text", nullable: true })
  company?: string | null;

  @Column({ type: "text" })
  subject!: string;

  @Column({ type: "text" })
  message!: string;

  @Column({ type: "text", default: "new" })
  status!: ContactMessageStatus;

  /** Origem do envio: "app" (logado) ou "public" (site). */
  @Column({ type: "text", nullable: true })
  source?: string | null;
}
