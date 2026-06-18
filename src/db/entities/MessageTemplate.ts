import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "message_templates" })
export class MessageTemplate extends AppBaseEntity {
  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text" })
  channel!: "whatsapp" | "messenger" | "instagram";

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", default: "" })
  greeting!: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  icebreakers!: string[];
}
