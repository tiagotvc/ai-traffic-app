import { Column, Entity, Index } from "typeorm";
import { AppBaseEntity } from "./_shared";

export type CommanderConversationMessage = {
  role: "user" | "assistant";
  content: string;
  ruleProposal?: Record<string, unknown> | null;
  actionChips?: Record<string, unknown>[];
  createdAt: string;
};

/**
 * Memória multi-turn persistida do chat do Orion Commander — uma linha por
 * (tenantId, clientId), compartilhada no tenant (mesma convenção das preferências do
 * Commander: tenant+client, não por usuário). `messages` guarda só as últimas ~40
 * trocas — trim aplicado no momento de salvar, não aqui.
 */
@Entity({ name: "commander_conversations" })
@Index(["tenantId", "clientId"], { unique: true })
export class CommanderConversation extends AppBaseEntity {
  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  clientId!: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  messages!: CommanderConversationMessage[];
}
