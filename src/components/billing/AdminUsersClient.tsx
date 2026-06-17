"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AdminUsersListSkeleton } from "@/components/billing/BillingSkeletons";
import { CompactPageHeader } from "@/components/layout/CompactPageHeader";
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
  "flex min-h-[28px] items-center text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap";

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
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
        <AdminIcon name="shield" className="h-3 w-3" />
        {adminLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
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
        <CompactPageHeader
          title={t("usersTitle")}
          subtitle={t("usersSubtitle")}
          badge={
            <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white px-3 py-2 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                {t("usersTotal", { count: total })}
              </p>
            </div>
          }
        />

        <form onSubmit={onSearch} className="relative max-w-xl">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <AdminIcon name="search" className="h-3.5 w-3.5" />
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("usersSearchPlaceholder")}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-24 text-xs text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
          <button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            {t("usersSearchBtn")}
          </button>
        </form>

        <div className="w-full pb-2">
          <div className={`${ADMIN_USERS_ROW_GRID} mb-3`}>
            <span className={HDR}>{t("usersColUser")}</span>
            <span className={HDR}>{t("usersColPlan")}</span>
            <span className={HDR}>{t("usersColStatus")}</span>
            <span className={HDR}>{t("usersColRole")}</span>
            <span className={HDR}>{t("usersColJoined")}</span>
            <span className={`${HDR} justify-end`} aria-hidden />
          </div>

          <div className="space-y-2.5">
            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-12 text-center">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <AdminIcon name="user" className="h-5 w-5" />
                </span>
                <p className="font-medium text-slate-700">{t("usersEmpty")}</p>
                {search ? (
                  <p className="mt-1 text-sm text-slate-400">
                    {t("usersSearchPlaceholder")}: “{search}”
                  </p>
                ) : null}
              </div>
            ) : (
              users.map((u) => (
                <article
                  key={u.id}
                  className={`group ${ADMIN_USERS_ROW_GRID} rounded-xl border border-slate-200/90 bg-white py-2.5 shadow-sm transition hover:border-slate-300 hover:shadow-md`}
                >
                  <div className={`${CELL} min-w-0 gap-3.5`}>
                    <UserAvatar name={u.name} email={u.email} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{u.name || "—"}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{u.email}</p>
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

                  <div className={`${CELL} whitespace-nowrap text-xs text-slate-500`}>
                    {formatDate(u.createdAt)}
                  </div>

                  <div className={`${CELL} justify-end`}>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-semibold text-violet-700 shadow-sm transition group-hover:border-violet-300 group-hover:bg-violet-100"
                    >
                      {t("usersManage")}
                      <AdminIcon name="chevron" className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className="sticky bottom-0 z-10 -mx-6 mt-6 border-t border-slate-200/80 bg-[#f4f6f9]/90 px-6 py-3 backdrop-blur-md lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{t("usersTotal", { count: total })}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("usersPrev")}
            </button>
            <span className="min-w-[4rem] text-center font-medium text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("usersNext")}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
