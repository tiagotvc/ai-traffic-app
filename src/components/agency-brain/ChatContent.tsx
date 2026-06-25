"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";

export type ChatProposal = {
  tempId: string;
  title: string;
  description: string;
  actionType: string;
  metaCampaignId: string | null;
  budgetIncreasePercent?: number | null;
  learningTitle?: string | null;
  linkedLearningId?: string | null;
  evidenceReason?: string;
  executable: boolean;
};

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  proposals?: ChatProposal[];
};

function buildMeetingExport(
  clientLabel: string,
  messages: ChatMessage[],
  meetingMode: boolean
): string {
  const lines = [
    `# Agency Brain — ${meetingMode ? "Modo Reunião" : "Chat"}`,
    `Cliente: ${clientLabel}`,
    `Exportado: ${new Date().toLocaleString()}`,
    "",
    "---",
    ""
  ];

  for (const msg of messages) {
    const who = msg.role === "user" ? "Pergunta" : "Assistente";
    lines.push(`## ${who}`, "", msg.text, "");
    if (msg.proposals?.length) {
      lines.push("### Propostas", "");
      for (const p of msg.proposals) {
        lines.push(`- **${p.title}** (${p.actionType}): ${p.description}`);
        if (p.learningTitle) lines.push(`  - Aprendizado: ${p.learningTitle}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function ChatContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [meetingMode, setMeetingMode] = useState(false);
  const [agentMode, setAgentMode] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agency-brain/ai-status")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setAgentMode(!!j.agentLayerEnabled);
      })
      .catch(() => {});
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    setMessage(null);
    setMessages((prev) => [...prev, { role: "user", text }]);

    try {
      const res = await fetch("/api/agency-brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          message: text,
          mode: meetingMode ? "meeting" : "default"
        })
      });
      const json = await res.json();
      if (res.status === 402 || json.code === "PLAN_LIMIT") {
        setMessage({ type: "err", text: t("aiLimit") });
        return;
      }
      if (json.code === "NO_AI_KEY") {
        setMessage({ type: "err", text: t("aiNoKey") });
        return;
      }
      if (!json.ok) {
        setMessage({ type: "err", text: json.error ?? t("chatError") });
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: json.answer,
          proposals: json.proposals ?? undefined
        }
      ]);
    } catch {
      setMessage({ type: "err", text: t("chatError") });
    } finally {
      setSending(false);
    }
  }, [clientId, input, meetingMode, sending, t]);

  const approveProposal = useCallback(
    async (proposal: ChatProposal, messageIndex: number) => {
      setExecutingId(proposal.tempId);
      setMessage(null);
      try {
        const res = await fetch("/api/agency-brain/chat/proposals/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, proposal })
        });
        const json = await res.json();
        if (!json.ok) {
          setMessage({ type: "err", text: json.error ?? t("chatProposalError") });
          return;
        }
        const detail = json.executed
          ? json.meta?.detail ?? t("chatProposalExecuted")
          : json.detail ?? t("chatProposalRegistered");
        setMessage({ type: "ok", text: detail });
        setMessages((prev) =>
          prev.map((m, i) =>
            i === messageIndex && m.proposals
              ? {
                  ...m,
                  proposals: m.proposals.map((p) =>
                    p.tempId === proposal.tempId ? { ...p, executable: false } : p
                  )
                }
              : m
          )
        );
      } catch {
        setMessage({ type: "err", text: t("chatProposalError") });
      } finally {
        setExecutingId(null);
      }
    },
    [clientId, t]
  );

  function handleExport() {
    if (!messages.length) return;
    const md = buildMeetingExport(clientId, messages, meetingMode);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agency-brain-${clientId}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "ok", text: t("chatExportDone") });
  }

  async function handleCopyExport() {
    if (!messages.length) return;
    const md = buildMeetingExport(clientId, messages, meetingMode);
    try {
      await navigator.clipboard.writeText(md);
      setMessage({ type: "ok", text: t("chatCopyDone") });
    } catch {
      setMessage({ type: "err", text: t("chatExportError") });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-dim)]">
            <input
              type="checkbox"
              checked={meetingMode}
              onChange={(e) => setMeetingMode(e.target.checked)}
              className="rounded border-[var(--border-color)]"
            />
            {t("chatMeetingMode")}
          </label>
          {agentMode ? (
            <span className="rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--ui-accent)]">
              {t("chatAgentBadge")}
            </span>
          ) : null}
        </div>
        {messages.length > 0 ? (
          <div className="flex gap-2">
            <button type="button" className="ui-btn-secondary text-xs" onClick={() => void handleCopyExport()}>
              {t("chatCopyExport")}
            </button>
            <button type="button" className="ui-btn-secondary text-xs" onClick={handleExport}>
              {t("chatDownloadExport")}
            </button>
          </div>
        ) : null}
      </div>

      {meetingMode ? (
        <p className="text-xs text-[var(--text-dim)]">{t("chatMeetingHint")}</p>
      ) : agentMode ? (
        <p className="text-xs text-[var(--text-dim)]">{t("chatAgentHint")}</p>
      ) : null}

      <FeedbackBanner message={message} />

      <div className="ui-card flex min-h-[400px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-[var(--text-dim)]">{t("chatEmpty")}</p>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "ml-8 bg-[rgba(124,58,237,0.1)] text-[var(--violet)]"
                      : "mr-8 bg-[var(--surface-thead)] text-[var(--text-main)]"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
                    {msg.role === "user" ? t("chatYou") : t("chatAssistant")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{msg.text}</p>
                </div>
                {msg.proposals?.length ? (
                  <div className="mr-8 space-y-2">
                    {msg.proposals.map((p) => (
                      <div
                        key={p.tempId}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm"
                      >
                        <p className="font-semibold text-[var(--text-main)]">{p.title}</p>
                        <p className="mt-1 text-[var(--text-dim)]">{p.description}</p>
                        {p.learningTitle ? (
                          <p className="mt-2 text-xs text-[var(--ui-accent)]">
                            {t("chatProposalLearning", { title: p.learningTitle })}
                          </p>
                        ) : null}
                        {p.evidenceReason ? (
                          <p className="mt-1 text-xs text-[var(--text-dimmer)]">{p.evidenceReason}</p>
                        ) : null}
                        {p.executable ? (
                          <button
                            type="button"
                            className="ui-btn-accent mt-3 text-xs"
                            disabled={executingId === p.tempId}
                            onClick={() => void approveProposal(p, i)}
                          >
                            {executingId === p.tempId
                              ? t("chatProposalExecuting")
                              : t("chatProposalApprove")}
                          </button>
                        ) : (
                          <p className="mt-2 text-xs text-[var(--text-dimmer)]">
                            {t("chatProposalDone")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
          {sending ? (
            <p className="text-center text-xs text-[var(--text-dimmer)]">{t("chatThinking")}</p>
          ) : null}
        </div>

        <div className="border-t border-[var(--border-color)] p-4">
          <div className="flex gap-2">
            <input
              className="ui-input flex-1"
              placeholder={meetingMode ? t("chatMeetingPlaceholder") : t("chatPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              disabled={sending}
            />
            <button
              type="button"
              className="ui-btn-primary shrink-0"
              onClick={() => void sendMessage()}
              disabled={sending || !input.trim()}
            >
              {sending ? t("chatSending") : t("chatSend")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
