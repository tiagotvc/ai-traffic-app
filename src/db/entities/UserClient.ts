import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "user_clients" })
export class UserClient {
  @PrimaryColumn({ type: "uuid" })
  userId!: string;

  @PrimaryColumn({ type: "uuid" })
  clientId!: string;

  @Column({ type: "text", default: "gestor" })
  role!: string;
}
