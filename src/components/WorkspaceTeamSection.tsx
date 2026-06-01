"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

type MemberRow = {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  isSelf: boolean;
};

type InviteRow = {
  id: string;
  email: string;
  role: string;
  inviteUrl: string;
};

export function WorkspaceTeamSection() {
  const t = useTranslations("settings");
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [message, setMessage] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const load = useCallback(() => {
    fetch("/api/workspace/members")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setIsAdmin(!!j.isAdmin);
          setMembers(j.members ?? []);
          setInvites(j.invites ?? []);
        }
      })
      .catch(() => setMessage(t("loadFailed")));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="ui-card p-4">
      <div className="text-sm font-semibold">{t("teamTitle")}</div>
      <p className="mt-1 text-xs text-slate-500">{t("teamHint")}</p>

      {!isAdmin ? (
        <p className="mt-3 text-xs text-slate-500">{t("teamOnlyAdmin")}</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <div className="text-xs text-slate-500">{t("teamEmail")}</div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full ui-input"
              placeholder="colega@empresa.com"
            />
          </div>
          <div>
            <div className="text-xs text-slate-500">{t("teamRole")}</div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
              className="mt-1 ui-select"
            >
              <option value="member">{t("teamRoleMember")}</option>
              <option value="admin">{t("teamRoleAdmin")}</option>
            </select>
          </div>
          <button
            type="button"
            disabled={isPending || !email.trim()}
            className="ui-btn-primary"
            onClick={() => {
              setMessage(null);
              setLastInviteUrl(null);
              startTransition(async () => {
                const res = await fetch("/api/workspace/members", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ email, role })
                });
                const j = await res.json().catch(() => null);
                if (j?.ok) {
                  setMessage(t("teamInviteSent"));
                  setLastInviteUrl(j.invite?.inviteUrl ?? null);
                  setEmail("");
                  load();
                } else {
                  setMessage(j?.error ?? t("teamInviteFailed"));
                }
              });
            }}
          >
            {t("teamInvite")}
          </button>
        </div>
      )}

      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
      {lastInviteUrl ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-700">
            {lastInviteUrl}
          </code>
          <button
            type="button"
            className="text-xs font-medium text-violet-600 underline"
            onClick={() => {
              void navigator.clipboard.writeText(lastInviteUrl);
              setMessage(t("teamCopied"));
            }}
          >
            {t("teamCopyLink")}
          </button>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="text-xs font-medium text-slate-500">{t("teamMembers")}</div>
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between gap-2 py-2">
              <div>
                <span className="font-medium text-slate-800">{m.email}</span>
                {m.name ? <span className="ml-2 text-slate-500">({m.name})</span> : null}
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-600">
                  {m.role}
                </span>
              </div>
              {isAdmin && !m.isSelf ? (
                <button
                  type="button"
                  className="text-xs text-red-600 underline"
                  onClick={() => {
                    if (!confirm(t("teamRemove") + "?")) return;
                    fetch(`/api/workspace/members/${m.userId}`, { method: "DELETE" }).then(load);
                  }}
                >
                  {t("teamRemove")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {isAdmin ? (
        <div className="mt-4">
          <div className="text-xs font-medium text-slate-500">{t("teamPending")}</div>
          {invites.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">{t("teamNoPending")}</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-2">
                  <span>
                    {i.email} · {i.role}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-violet-600 underline"
                    onClick={() => {
                      void navigator.clipboard.writeText(i.inviteUrl);
                      setMessage(t("teamCopied"));
                    }}
                  >
                    {t("teamCopyLink")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
