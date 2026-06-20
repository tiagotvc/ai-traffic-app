"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

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

const AVATAR_PALETTE = [
  "bg-[var(--violet-bright)]",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-[var(--amber-bright)]",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-fuchsia-500"
];

function initialsFor(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const seed = name || email;
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(
        seed
      )}`}
      aria-hidden
    >
      {initialsFor(seed)}
    </span>
  );
}

function RoleBadge({ role, ownerLabel, adminLabel, memberLabel }: {
  role: string;
  ownerLabel: string;
  adminLabel: string;
  memberLabel: string;
}) {
  const normalized = role.toLowerCase();
  const isPrivileged = normalized === "owner" || normalized === "admin";
  const label =
    normalized === "owner" ? ownerLabel : normalized === "admin" ? adminLabel : memberLabel;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        isPrivileged
          ? "bg-[rgba(245,166,35,0.12)] text-[var(--amber)] ring-1 ring-inset ring-[rgba(245,166,35,0.25)]"
          : "bg-[var(--surface-thead)] text-[var(--text-dim)] ring-1 ring-inset ring-[var(--border-color)]"
      }`}
    >
      {label}
    </span>
  );
}

export function WorkspaceTeamSection({
  workspaceName
}: {
  workspaceName?: string;
}) {
  const t = useTranslations("settings");
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [message, setMessage] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"team" | "pending">("team");
  const [inviteOpen, setInviteOpen] = useState(false);

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

  const wsLabel = useMemo(() => workspaceName?.trim() || "Workspace", [workspaceName]);

  function submitInvite() {
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
        setTab("pending");
        load();
      } else {
        setMessage(j?.error ?? t("teamInviteFailed"));
      }
    });
  }

  return (
    <section className="ui-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-color)] px-5 py-4">
        <div>
          <div className="font-heading text-base font-semibold text-[var(--text-main)]">{t("teamMembers")}</div>
          <p className="mt-0.5 text-xs text-[var(--text-dimmer)]">{t("teamHint")}</p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            className="ui-btn-primary !px-3 !py-2 text-xs"
            onClick={() => {
              setInviteOpen((v) => !v);
              setMessage(null);
              setLastInviteUrl(null);
            }}
          >
            <span className="text-base leading-none">+</span>
            {t("teamInviteCta")}
          </button>
        ) : null}
      </div>

      {/* Invite panel (toggled) */}
      {isAdmin && inviteOpen ? (
        <div className="border-b border-[var(--border-color)] bg-[var(--surface-thead)] px-5 py-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <div className="ui-label">{t("teamEmail")}</div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full ui-input"
                placeholder="colega@empresa.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && email.trim() && !isPending) submitInvite();
                }}
              />
            </div>
            <div>
              <div className="ui-label">{t("teamRole")}</div>
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
              onClick={submitInvite}
            >
              {t("teamInvite")}
            </button>
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => {
                setInviteOpen(false);
                setEmail("");
              }}
            >
              {t("teamCancel")}
            </button>
          </div>

          {message ? <p className="mt-2 text-xs text-[var(--text-dim)]">{message}</p> : null}
          {lastInviteUrl ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="max-w-full truncate rounded bg-[var(--surface-card)] px-2 py-1 text-[11px] text-[var(--text-dim)] ring-1 ring-[var(--border-color)]">
                {lastInviteUrl}
              </code>
              <button
                type="button"
                className="ui-link text-xs underline"
                onClick={() => {
                  void navigator.clipboard.writeText(lastInviteUrl);
                  setMessage(t("teamCopied"));
                }}
              >
                {t("teamCopyLink")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {!isAdmin ? (
        <p className="px-5 py-3 text-xs text-[var(--text-dimmer)]">{t("teamOnlyAdmin")}</p>
      ) : null}

      {/* Tabs */}
      <div className="flex items-center gap-5 border-b border-[var(--border-color)] px-5">
        <button
          type="button"
          onClick={() => setTab("team")}
          className={`-mb-px border-b-2 py-2.5 text-sm font-medium transition ${
            tab === "team"
              ? "border-[var(--amber-bright)] text-[var(--text-main)]"
              : "border-transparent text-[var(--text-dimmer)] hover:text-[var(--text-dim)]"
          }`}
        >
          {t("teamTabTeam")}{" "}
          <span className="ml-0.5 text-[var(--text-dimmer)]">({members.length})</span>
        </button>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={`-mb-px border-b-2 py-2.5 text-sm font-medium transition ${
              tab === "pending"
                ? "border-[var(--amber-bright)] text-[var(--text-main)]"
                : "border-transparent text-[var(--text-dimmer)] hover:text-[var(--text-dim)]"
            }`}
          >
            {t("teamTabPending")}{" "}
            <span className="ml-0.5 text-[var(--text-dimmer)]">({invites.length})</span>
          </button>
        ) : null}
      </div>

      {/* Team table */}
      {tab === "team" ? (
        members.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--text-dimmer)]">{t("teamEmptyMembers")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-medium uppercase tracking-wide text-[var(--text-dimmer)]">
                <th className="px-5 py-2 font-medium">{t("teamMembers")}</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  {t("teamWorkspaceCol")}
                </th>
                <th className="px-3 py-2 font-medium">{t("teamRole")}</th>
                <th className="px-5 py-2 text-right font-medium">{t("teamColActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {members.map((m) => (
                <tr key={m.userId} className="hover:bg-[var(--row-hover)]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={m.name} email={m.email} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium text-[var(--text-main)]">
                            {m.name || m.email}
                          </span>
                          {m.isSelf ? (
                            <span className="rounded bg-[var(--surface-thead)] px-1.5 py-0.5 text-[10px] text-[var(--text-dimmer)]">
                              {t("teamYou")}
                            </span>
                          ) : null}
                        </div>
                        {m.name ? (
                          <div className="truncate text-xs text-[var(--text-dimmer)]">{m.email}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 sm:table-cell">
                    <span className="inline-flex items-center rounded-full bg-[var(--surface-thead)] px-2.5 py-0.5 text-xs text-[var(--text-dim)]">
                      {wsLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <RoleBadge
                      role={m.role}
                      ownerLabel={t("roleOwner")}
                      adminLabel={t("teamRoleAdmin")}
                      memberLabel={t("teamRoleMember")}
                    />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {isAdmin && !m.isSelf ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline"
                        onClick={() => {
                          if (!confirm(t("teamRemove") + "?")) return;
                          fetch(`/api/workspace/members/${m.userId}`, { method: "DELETE" }).then(
                            load
                          );
                        }}
                      >
                        {t("teamRemove")}
                      </button>
                    ) : (
                      <span className="text-[var(--text-dimmer)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : null}

      {/* Pending invites */}
      {tab === "pending" && isAdmin ? (
        invites.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[var(--text-dimmer)]">{t("teamNoPending")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {invites.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={null} email={i.email} />
                  <div>
                    <div className="font-medium text-[var(--text-main)]">{i.email}</div>
                    <div className="mt-0.5">
                      <RoleBadge
                        role={i.role}
                        ownerLabel={t("roleOwner")}
                        adminLabel={t("teamRoleAdmin")}
                        memberLabel={t("teamRoleMember")}
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="ui-link text-xs hover:underline"
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
        )
      ) : null}

      {message && !inviteOpen ? (
        <p className="px-5 py-2 text-xs text-[var(--text-dim)]">{message}</p>
      ) : null}
    </section>
  );
}
