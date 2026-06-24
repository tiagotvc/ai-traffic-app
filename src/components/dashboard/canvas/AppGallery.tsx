"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Blocks, Copy, Globe, LayoutGrid, Plus, Trash2, Users } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { LayoutDto } from "@/lib/dashboard/widget-catalog";

type ClientOption = { id: string; slug: string; name: string };

export function AppGallery({
  layouts,
  loading,
  maxApps,
  templates,
  clients,
  allowCreate = true,
  onCreateApp,
  onDeleteApp
}: {
  layouts: LayoutDto[];
  loading: boolean;
  maxApps: number;
  templates: Array<{ id: string; name: string }>;
  clients: ClientOption[];
  allowCreate?: boolean;
  onCreateApp: (name: string, options?: { templateId?: string; clientId?: string }) => Promise<string | null>;
  onDeleteApp: (id: string) => Promise<boolean>;
}) {
  const t = useTranslations("dashboardApps");
  const tViews = useTranslations("dashboardViews");
  const tW = useTranslations("dashboardWidgets");
  const [creating, setCreating] = useState(false);
  const [createMode, setCreateMode] = useState<"blank" | "client">("blank");
  const [newName, setNewName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [clientId, setClientId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LayoutDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const atLimit = maxApps > 0 && layouts.length >= maxApps;
  const sorted = useMemo(
    () => [...layouts].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [layouts]
  );

  async function handleCreate() {
    const name = newName.trim() || (createMode === "client" ? "" : t("defaultAppName"));
    if (createMode === "client" && !clientId) return;
    setSubmitting(true);
    const id = await onCreateApp(name, {
      templateId: templateId || undefined,
      clientId: createMode === "client" ? clientId : undefined
    });
    setSubmitting(false);
    if (id) {
      setCreating(false);
      setNewName("");
      setTemplateId("");
      setClientId("");
      setCreateMode("blank");
    }
  }

  async function copyViewLink(app: LayoutDto) {
    if (!app.viewToken || typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/views/${app.viewToken}`);
      setCopiedId(app.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const ok = await onDeleteApp(deleteTarget.id);
    setDeleting(false);
    if (ok) {
      setDeleteTarget(null);
    } else {
      setDeleteError(t("deleteAppError"));
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton-shimmer h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold" style={{ color: "var(--text-main)" }}>
            {t("galleryTitle")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
            {t("galleryHint")}
          </p>
        </div>
        {!atLimit && allowCreate ? (
          creating ? null : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreateMode("blank");
                  setCreating(true);
                }}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
                style={{ borderColor: "rgba(124,58,237,0.35)", color: "#a78bfa", background: "rgba(124,58,237,0.08)" }}
              >
                <Plus size={16} />
                {t("createApp")}
              </button>
              {clients.length ? (
                <button
                  type="button"
                  onClick={() => {
                    setCreateMode("client");
                    setCreating(true);
                  }}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
                  style={{ borderColor: "rgba(34,197,94,0.35)", color: "#22c55e", background: "rgba(34,197,94,0.08)" }}
                >
                  <Users size={16} />
                  {tViews("createClientView")}
                </button>
              ) : null}
            </div>
          )
        ) : null}
      </div>

      {creating ? (
        <CreateAppForm
          className="max-w-md rounded-xl border p-4"
          mode={createMode}
          newName={newName}
          templateId={templateId}
          clientId={clientId}
          templates={templates}
          clients={clients}
          submitting={submitting}
          onNameChange={setNewName}
          onTemplateChange={setTemplateId}
          onClientChange={setClientId}
          onCancel={() => {
            setCreating(false);
            setCreateMode("blank");
          }}
          onSubmit={() => void handleCreate()}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((app) => (
          <div
            key={app.id}
            className={cn(
              "group relative rounded-2xl border transition-all",
              "hover:border-[rgba(124,58,237,0.35)] hover:shadow-md"
            )}
            style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}
          >
            <button
              type="button"
              aria-label={t("deleteApp")}
              onClick={() => {
                setDeleteError(null);
                setDeleteTarget(app);
              }}
              className={cn(
                "absolute right-3 top-3 z-[1] rounded-lg p-1.5 transition-all",
                "opacity-70 hover:bg-[rgba(239,68,68,0.1)] hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
              )}
              style={{ color: "var(--text-dimmer)" }}
            >
              <Trash2 size={15} className="hover:text-red-500" />
            </button>

            {app.published && app.viewToken ? (
              <button
                type="button"
                aria-label={tViews("copyViewLink")}
                onClick={(e) => {
                  e.preventDefault();
                  void copyViewLink(app);
                }}
                className="absolute right-12 top-3 z-[1] rounded-lg p-1.5 opacity-70 transition-all hover:bg-[rgba(34,197,94,0.1)] hover:opacity-100"
                style={{ color: "var(--text-dimmer)" }}
              >
                <Copy size={15} className={copiedId === app.id ? "text-green-500" : ""} />
              </button>
            ) : null}

            <Link
              href={`/dashboard/apps/${app.id}?edit=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-2 pr-6">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors group-hover:bg-[rgba(124,58,237,0.12)]"
                  style={{ background: "var(--surface-bg)" }}
                >
                  <LayoutGrid size={20} style={{ color: "#818cf8" }} />
                </span>
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: "var(--surface-bg)", color: "var(--text-dimmer)" }}
                >
                  <Blocks size={10} />
                  {t("blockCount", { count: app.widgets.length })}
                </span>
              </div>
              <h3 className="truncate font-heading text-base font-semibold" style={{ color: "var(--text-main)" }}>
                {app.name}
              </h3>
              {app.clientName ? (
                <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--text-dim)" }}>
                  <Users size={12} />
                  {app.clientName}
                </p>
              ) : null}
              {app.published ? (
                <span
                  className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}
                >
                  <Globe size={10} />
                  {tViews("publishedBadge")}
                </span>
              ) : null}
              {app.subtitle ? (
                <p className="mt-1 line-clamp-2 text-sm" style={{ color: "var(--text-dim)" }}>
                  {app.subtitle}
                </p>
              ) : (
                <p className="mt-1 text-sm" style={{ color: "var(--text-dimmer)" }}>
                  {app.widgets.length ? t("openApp") : t("emptyAppHint")}
                </p>
              )}
            </Link>
          </div>
        ))}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-xl"
            style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
          >
            <h3 className="font-heading text-base font-semibold" style={{ color: "var(--text-main)" }}>
              {t("deleteAppConfirmTitle")}
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--text-dim)" }}>
              {t("deleteAppConfirmHint", { name: deleteTarget.name })}
            </p>
            {deleteError ? (
              <p className="mt-2 text-sm text-red-500">{deleteError}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: "var(--border-color)", color: "var(--text-dim)" }}
              >
                {tW("configCancel")}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteConfirm()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#ef4444" }}
              >
                {deleting ? t("deletingApp") : t("deleteAppConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CreateAppForm({
  className,
  mode,
  newName,
  templateId,
  clientId,
  templates,
  clients,
  submitting,
  onNameChange,
  onTemplateChange,
  onClientChange,
  onCancel,
  onSubmit
}: {
  className?: string;
  mode: "blank" | "client";
  newName: string;
  templateId: string;
  clientId: string;
  templates: Array<{ id: string; name: string }>;
  clients: ClientOption[];
  submitting: boolean;
  onNameChange: (v: string) => void;
  onTemplateChange: (v: string) => void;
  onClientChange: (v: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const t = useTranslations("dashboardApps");
  const tViews = useTranslations("dashboardViews");
  const tW = useTranslations("dashboardWidgets");

  return (
    <div className={className} style={{ borderColor: "var(--border-color)", background: "var(--surface-card)" }}>
      <p className="mb-3 text-sm font-semibold" style={{ color: "var(--text-main)" }}>
        {mode === "client" ? tViews("createClientView") : t("createApp")}
      </p>
      {mode === "client" ? (
        <select
          value={clientId}
          onChange={(e) => onClientChange(e.target.value)}
          className="ui-input mb-2 w-full text-sm"
          required
        >
          <option value="">{tViews("selectClient")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      ) : null}
      <input
        value={newName}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={mode === "client" ? tViews("viewNamePlaceholder") : t("appNamePlaceholder")}
        className="ui-input mb-2 w-full"
        autoFocus
      />
      {mode === "blank" && templates.length ? (
        <select
          value={templateId}
          onChange={(e) => onTemplateChange(e.target.value)}
          className="ui-input mb-3 w-full text-sm"
        >
          <option value="">{tW("blankDashboard")}</option>
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.name}
            </option>
          ))}
        </select>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="ui-btn ui-btn-ghost text-sm">
          {tW("configCancel")}
        </button>
        <button
          type="button"
          disabled={submitting || (mode === "client" && !clientId)}
          onClick={onSubmit}
          className="ui-btn ui-btn-primary text-sm disabled:opacity-50"
        >
          {submitting ? t("creatingApp") : mode === "client" ? tViews("createClientView") : t("createApp")}
        </button>
      </div>
    </div>
  );
}
