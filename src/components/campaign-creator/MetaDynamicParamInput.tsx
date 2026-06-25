"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { META_URL_DYNAMIC_PARAMS } from "@/lib/campaign-utm";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function findTriggerStart(text: string, cursor: number): number | null {
  const before = text.slice(0, cursor);
  const idx = before.lastIndexOf("{{");
  if (idx === -1) return null;
  const afterOpen = before.slice(idx + 2);
  if (afterOpen.includes("}}") || afterOpen.includes("\n")) return null;
  return idx;
}

export function MetaDynamicParamInput({
  value,
  onChange,
  placeholder,
  disabled,
  className = "ui-input text-xs font-mono"
}: Props) {
  const t = useTranslations("campaignCreator");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [triggerStart, setTriggerStart] = useState<number | null>(null);
  const [highlight, setHighlight] = useState(0);

  const query =
    triggerStart !== null && inputRef.current
      ? value.slice(triggerStart + 2, inputRef.current.selectionStart ?? value.length).toLowerCase()
      : "";

  const suggestions = META_URL_DYNAMIC_PARAMS.filter(({ token, labelKey }) => {
    const label = t(labelKey).toLowerCase();
    return token.toLowerCase().includes(query) || label.includes(query);
  });

  const close = useCallback(() => {
    setOpen(false);
    setTriggerStart(null);
    setHighlight(0);
  }, []);

  function checkTrigger() {
    const el = inputRef.current;
    if (!el || disabled) {
      close();
      return;
    }
    const cursor = el.selectionStart ?? value.length;
    const start = findTriggerStart(value, cursor);
    if (start !== null) {
      setTriggerStart(start);
      setOpen(true);
      setHighlight(0);
    } else {
      close();
    }
  }

  function insertToken(token: string) {
    const el = inputRef.current;
    if (!el || triggerStart === null) return;
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, triggerStart);
    const after = value.slice(cursor);
    const next = `${before}${token}${after}`;
    const pos = before.length + token.length;
    onChange(next);
    close();
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Escape") close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertToken(suggestions[highlight]?.token ?? suggestions[0]!.token);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlight] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          requestAnimationFrame(checkTrigger);
        }}
        onFocus={checkTrigger}
        onClick={checkTrigger}
        onKeyUp={checkTrigger}
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          const related = e.relatedTarget as Node | null;
          if (related && listRef.current?.contains(related)) return;
          close();
        }}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
      />
      {open && suggestions.length > 0 ? (
        <ul
          ref={listRef}
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] py-1 shadow-lg"
        >
          {suggestions.map(({ token, labelKey }, i) => (
            <li key={token}>
              <button
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertToken(token)}
                className={`flex w-full flex-col gap-0.5 px-3 py-1.5 text-left transition ${
                  i === highlight ? "bg-[rgba(124,58,237,0.1)]" : "hover:bg-[var(--surface-thead)]"
                }`}
              >
                <span className="font-mono text-[11px] text-[var(--violet)]">{token}</span>
                <span className="text-[10px] text-[var(--text-dimmer)]">{t(labelKey)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
