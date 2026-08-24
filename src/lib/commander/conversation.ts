import "server-only";

import { repositories } from "@/db/repositories";
import type { CommanderConversationMessage } from "@/db/entities/CommanderConversation";

/** Guardamos mais mensagens do que mandamos pro prompt — histórico visível > custo de tokens. */
const MAX_STORED_MESSAGES = 40;
/** Últimas ~6 trocas (12 mensagens) — suficiente pra continuidade sem inflar o prompt. */
const MAX_HISTORY_MESSAGES_FOR_PROMPT = 12;

export type CommanderPromptTurn = { role: "user" | "assistant"; content: string };

/** Mensagens salvas de um cliente, prontas pra hidratar a UI (mais antiga primeiro). */
export async function loadCommanderConversationMessages(
  tenantId: string,
  clientId: string
): Promise<CommanderConversationMessage[]> {
  const { commanderConversation: repo } = await repositories();
  const conv = await repo.findOne({ where: { tenantId, clientId } });
  return conv?.messages ?? [];
}

/** Últimas trocas, no formato que `askCommander()` injeta no prompt. */
export async function getCommanderHistoryForPrompt(
  tenantId: string,
  clientId: string
): Promise<CommanderPromptTurn[]> {
  const messages = await loadCommanderConversationMessages(tenantId, clientId);
  return messages
    .slice(-MAX_HISTORY_MESSAGES_FOR_PROMPT)
    .map((m) => ({ role: m.role, content: m.content }));
}

/** Grava a troca (pergunta + resposta) na conversa persistida do cliente, com trim. */
export async function appendCommanderTurn(input: {
  tenantId: string;
  clientId: string;
  question: string;
  answer: string;
  ruleProposal?: Record<string, unknown> | null;
  actionChips?: Record<string, unknown>[];
}): Promise<void> {
  const { commanderConversation: repo } = await repositories();
  const now = new Date().toISOString();
  const newMessages: CommanderConversationMessage[] = [
    { role: "user", content: input.question, createdAt: now },
    {
      role: "assistant",
      content: input.answer,
      ruleProposal: input.ruleProposal ?? null,
      actionChips: input.actionChips ?? [],
      createdAt: now
    }
  ];

  const existing = await repo.findOne({ where: { tenantId: input.tenantId, clientId: input.clientId } });
  if (existing) {
    existing.messages = [...existing.messages, ...newMessages].slice(-MAX_STORED_MESSAGES);
    await repo.save(existing);
    return;
  }
  await repo.save(
    repo.create({ tenantId: input.tenantId, clientId: input.clientId, messages: newMessages })
  );
}

/** Zera a conversa do cliente — usuário recomeçando do zero. */
export async function resetCommanderConversation(tenantId: string, clientId: string): Promise<void> {
  const { commanderConversation: repo } = await repositories();
  const existing = await repo.findOne({ where: { tenantId, clientId } });
  if (!existing) return;
  existing.messages = [];
  await repo.save(existing);
}
