"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { FeedbackBanner, type FeedbackMessage } from "@/components/agency-brain/FeedbackBanner";

type ChatMessage = { role: "user" | "assistant"; text: string };

export function ChatContent({ clientId }: { clientId: string }) {
  const t = useTranslations("agencyBrain");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);

  async function handleSend() {
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
        body: JSON.stringify({ clientId, message: text })
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
  }

  return (
    <div className="space-y-4">
      <FeedbackBanner message={message} />

      <div className="ui-card flex min-h-[400px] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-slate-500">{t("chatEmpty")}</p>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "ml-8 bg-violet-100 text-violet-900"
                    : "mr-8 bg-slate-100 text-slate-800"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {msg.role === "user" ? t("chatYou") : t("chatAssistant")}
                </p>
                <p className="mt-1">{msg.text}</p>
              </div>
            ))
          )}
          {sending ? (
            <p className="text-center text-xs text-slate-400">{t("chatThinking")}</p>
          ) : null}
        </div>

        <div className="border-t border-slate-200 p-4">
          <div className="flex gap-2">
            <input
              className="ui-input flex-1"
              placeholder={t("chatPlaceholder")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={sending}
            />
            <button
              type="button"
              className="ui-btn-primary shrink-0"
              onClick={() => void handleSend()}
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
