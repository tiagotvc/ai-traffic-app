import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "tenant_sync_state" })
export class TenantSyncState {
  @PrimaryColumn({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "timestamptz", nullable: true })
  lastManualSyncAt?: Date | null;

  @Column({ type: "uuid", nullable: true })
  activeSyncRunId?: string | null;
}
