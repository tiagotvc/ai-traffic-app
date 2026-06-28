"use client";

import { ChevronRight, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AdminUsersListSkeleton } from "@/components/billing/BillingSkeletons";
import { FilterSearchInput } from "@/components/FilterSearchInput";
import { DsPageHeader } from "@/design-system";
import {
  ADMIN_USERS_ROW_GRID,
  AdminIcon,
  PlanBadge,
  StatusBadge,
  UserAvatar
} from "@/components/billing/AdminUserUi";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  platformRole: "user" | "admin";
  tenantId: string;
  tenantName: string;
  planSlug: string;
  planName: string;
  subscriptionStatus: string;
  createdAt: string;
};

function planLabel(
  t: ReturnType<typeof useTranslations<"billingAdmin">>,
  slug: string,
  fallback: string
) {
  const keys: Record<string, "usersPlanFree" | "usersPlanBasic" | "usersPlanAdvanced" | "usersPlanAgency"> = {
    free: "usersPlanFree",
    basic: "usersPlanBasic",
    advanced: "usersPlanAdvanced",
    agency: "usersPlanAgency"
  };
  const key = keys[slug];
  return key ? t(key) : fallback;
}

function statusLabel(t: ReturnType<typeof useTranslations<"billingAdmin">>, status: string) {
  const keys: Record<
    string,
    | "usersStatusActive"
    | "usersStatusTrialing"
    | "usersStatusPast_due"
    | "usersStatusSuspended"
    | "usersStatusCanceled"
  > = {
    active: "usersStatusActive",
    trialing: "usersStatusTrialing",
    past_due: "usersStatusPast_due",
    suspended: "usersStatusSuspended",
    canceled: "usersStatusCanceled"
  };
  const key = keys[status];
  return key ? t(key) : status;
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

const HDR =
  "flex min-h-[28px] items-center text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dimmer)] whitespace-nowrap";

const CELL = "flex min-h-[28px] items-center";

function RoleBadge({
  role,
  adminLabel,
  userLabel
}: {
  role: "user" | "admin";
  adminLabel: string;
  userLabel: string;
}) {
  if (role === "admin") {
    return (
      <span className="ds-table-compact-badge ds-table-compact-badge--accent">
        {adminLabel}
      </span>
    );
  }
  return (
    <span className="ds-table-compact-badge ds-table-compact-badge--neutral">
      {userLabel}
    </span>
  );
}

export function AdminUsersClient() {
  const t = useTranslations("billingAdmin");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search) params.set("q", search);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (data.ok) {
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(q.trim());
  }

  if (loading && users.length === 0) {
    return <AdminUsersListSkeleton />;
  }

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col">
      <div className={`flex-1 space-y-4 ${loading ? "opacity-60" : ""}`}>
        <DsPageHeader
          title={t("usersTitle")}
          subtitle={t("usersSubtitle")}
          titleIcon={<Users size={16} />}
          actions={
            <span className="ds-table-compact-badge ds-table-compact-badge--accent">
              {t("usersTotal", { count: total })}
            </span>
          }
        />

        <form onSubmit={onSearch} className="flex max-w-xl flex-wrap items-center gap-2">
          <FilterSearchInput
            creatorField
            size="wide"
            value={q}
            onChange={setQ}
            placeholder={t("usersSearchPlaceholder")}
            aria-label={t("usersSearchPlaceholder")}
          />
          <button type="submit" className="ui-btn-primary shrink-0 text-xs">
            {t("usersSearchBtn")}
          </button>
        </form>

        <div className="ui-campaign-table-shell ui-campaign-table-shell--compact w-full pb-2">
          <div className="ui-campaign-table-shell__header">
            <div className="ui-campaign-table-shell__title">
              <span className="ui-campaign-table-shell__icon">
                <Users size={15} strokeWidth={2} />
              </span>
              <span>{t("usersTitle")}</span>
            </div>
          </div>

          <div className={`${ADMIN_USERS_ROW_GRID} border-b border-[var(--creator-card-border)] px-3 py-2`}>
            <span className={HDR}>{t("usersColUser")}</span>
            <span className={HDR}>{t("usersColPlan")}</span>
            <span className={HDR}>{t("usersColStatus")}</span>
            <span className={HDR}>{t("usersColRole")}</span>
            <span className={HDR}>{t("usersColJoined")}</span>
            <span className={`${HDR} justify-end`} aria-hidden />
          </div>

          <div className="divide-y divide-[var(--creator-card-border)]">
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                <span className="ui-toolbar-icon-shell mb-3">
                  <AdminIcon name="user" className="h-5 w-5 text-[var(--text-dimmer)]" />
                </span>
                <p className="text-sm font-medium text-[var(--text-dim)]">{t("usersEmpty")}</p>
                {search ? (
                  <p className="mt-1 text-xs text-[var(--text-dimmer)]">
                    {t("usersSearchPlaceholder")}: “{search}”
                  </p>
                ) : null}
              </div>
            ) : (
              users.map((u) => (
                <article
                  key={u.id}
                  className={`group ${ADMIN_USERS_ROW_GRID} px-3 py-2 transition hover:bg-[color-mix(in_srgb,var(--ui-accent)_4%,transparent)]`}
                >
                  <div className={`${CELL} min-w-0 gap-3`}>
                    <UserAvatar name={u.name} email={u.email} />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[var(--text-main)]">{u.name || "—"}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]">{u.email}</p>
                    </div>
                  </div>

                  <div className={CELL}>
                    <PlanBadge
                      slug={u.planSlug}
                      name={u.planName}
                      label={planLabel(t, u.planSlug, u.planName)}
                    />
                  </div>

                  <div className={CELL}>
                    <StatusBadge status={u.subscriptionStatus} label={statusLabel(t, u.subscriptionStatus)} />
                  </div>

                  <div className={CELL}>
                    <RoleBadge
                      role={u.platformRole}
                      adminLabel={t("usersRoleAdmin")}
                      userLabel={t("usersRoleUser")}
                    />
                  </div>

                  <div className={`${CELL} whitespace-nowrap text-xs text-[var(--text-dim)]`}>
                    {formatDate(u.createdAt)}
                  </div>

                  <div className={`${CELL} justify-end`}>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="ds-table-compact-action inline-flex items-center gap-0.5"
                    >
                      {t("usersManage")}
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className="sticky bottom-0 z-10 -mx-6 mt-6 border-t border-[var(--creator-card-border)] bg-[color-mix(in_srgb,var(--creator-card-bg)_92%,transparent)] px-6 py-3 backdrop-blur-md lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-dim)]">
          <span>{t("usersTotal", { count: total })}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="ui-btn-secondary px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("usersPrev")}
            </button>
            <span className="min-w-[4rem] text-center font-medium text-[var(--text-dim)]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="ui-btn-secondary px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("usersNext")}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
