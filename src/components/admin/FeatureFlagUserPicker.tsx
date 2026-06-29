"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type UserOption = {
  id: string;
  email: string;
  name: string | null;
};

type Props = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function FeatureFlagUserPicker({ selectedIds, onChange, disabled }: Props) {
  const t = useTranslations("billingAdmin");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<UserOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?q=${encodeURIComponent(q.trim())}&limit=12`
      );
      const json = await res.json();
      if (json.ok && Array.isArray(json.users)) {
        setOptions(
          json.users.map((u: UserOption) => ({
            id: u.id,
            email: u.email,
            name: u.name
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void search(query), 300);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    const missing = selectedIds.filter((id) => !selectedUsers.some((u) => u.id === id));
    if (missing.length === 0) return;
    void (async () => {
      const res = await fetch(`/api/admin/users?limit=100`);
      const json = await res.json();
      if (!json.ok || !Array.isArray(json.users)) return;
      const found = json.users.filter((u: UserOption) => missing.includes(u.id));
      if (found.length) {
        setSelectedUsers((prev) => {
          const merged = [...prev];
          for (const u of found) {
            if (!merged.some((x) => x.id === u.id)) merged.push(u);
          }
          return merged;
        });
      }
    })();
  }, [selectedIds, selectedUsers]);

  function addUser(user: UserOption) {
    if (selectedIds.includes(user.id)) return;
    setSelectedUsers((prev) => [...prev, user]);
    onChange([...selectedIds, user.id]);
    setQuery("");
    setOptions([]);
  }

  function removeUser(id: string) {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--text-dim)]">{t("featureFlagsUserPickerHint")}</p>
      <div className="flex flex-wrap gap-1.5">
        {selectedUsers
          .filter((u) => selectedIds.includes(u.id))
          .map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] px-2 py-1 text-xs text-[var(--text-main)]"
            >
              <span className="max-w-[180px] truncate">{u.name || u.email}</span>
              <button
                type="button"
                className="text-[var(--text-dimmer)] hover:text-[var(--text-main)]"
                disabled={disabled}
                aria-label={t("featureFlagsUserRemove")}
                onClick={() => removeUser(u.id)}
              >
                ×
              </button>
            </span>
          ))}
      </div>
      <div className="relative">
        <input
          type="search"
          className="ui-input w-full border-[var(--creator-card-border)] bg-[var(--creator-card-bg-inset)] text-sm"
          placeholder={t("featureFlagsUserSearchPlaceholder")}
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading ? (
          <p className="mt-1 text-[11px] text-[var(--text-dimmer)]">{t("loading")}</p>
        ) : null}
        {options.length > 0 ? (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--creator-card-border)] bg-[var(--creator-card-bg)] shadow-lg">
            {options.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-[color-mix(in_srgb,var(--ui-accent)_6%,transparent)]"
                  disabled={disabled || selectedIds.includes(u.id)}
                  onClick={() => addUser(u)}
                >
                  <span className="font-medium text-[var(--text-main)]">
                    {u.name || u.email}
                  </span>
                  {u.name ? (
                    <span className="mt-0.5 block text-xs text-[var(--text-dim)]">{u.email}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
