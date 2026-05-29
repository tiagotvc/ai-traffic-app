import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./_shared";

@Entity({ name: "notification_state" })
export class NotificationState extends AppBaseEntity {
  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "timestamptz", nullable: true })
  lastLogoutAt?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  lastLoginAt?: Date | null;
}

