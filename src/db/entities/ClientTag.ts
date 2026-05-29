import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "client_tags" })
export class ClientTag extends AppBaseEntity {
  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text" })
  tag!: string;
}
