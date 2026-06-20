"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";

type ChatMessage = { role: "user" | "assistant"; text: string };

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
  }

  return lines.join("\n");
}

export function ChatContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [meetingMode, setMeetingMode] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

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
      setMessages((prev) => [...prev, { role: "assistant", text: json.answer }]);
    } catch {
      setMessage({ type: "err", text: t("chatError") });
    } finally {
      setSending(false);
    }
  }, [clientId, input, meetingMode, sending, t]);

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
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-dim)]">
          <input
            type="checkbox"
            checked={meetingMode}
            onChange={(e) => setMeetingMode(e.target.checked)}
            className="rounded border-[var(--border-color)]"
          />
          {t("chatMeetingMode")}
        </label>
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
      ) : null}

      <FeedbackBanner message={message} />

      <div className="ui-card flex min-h-[400px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-[var(--text-dim)]">{t("chatEmpty")}</p>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
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
