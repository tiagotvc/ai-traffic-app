"use client";

import { X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useDismissOnOutsideClick } from "@/hooks/useDismissOnOutsideClick";
import { cn } from "@/lib/cn";
import { MAX_TAGS_PER_PERSONA, normalizeTag } from "@/lib/persona-tags";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags que já existem na biblioteca, para autocompletar (com contagem de uso). */
  suggestions?: Array<{ tag: string; count: number }>;
  disabled?: boolean;
  className?: string;
};

/**
 * Entrada de tags livres com autocompletar.
 *
 * O autocompletar existe para evitar que "beleza", "Beleza" e "beleza " virem
 * três tags diferentes — que é exatamente a bagunça que as tags resolvem.
 * A normalização final acontece no servidor (`normalizeTags`).
 */
export function PersonaTagsInput({
  value,
  onChange,
  suggestions = [],
  disabled = false,
  className
}: Props) {
  const t = useTranslations("audiences");
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useDismissOnOutsideClick(wrapRef, open, () => setOpen(false));

  const full = value.length >= MAX_TAGS_PER_PERSONA;

  const matches = useMemo(() => {
    const q = normalizeTag(draft);
    return suggestions
      .filter((s) => !value.includes(s.tag))
      .filter((s) => (q ? s.tag.includes(q) : true))
      .slice(0, 8);
  }, [suggestions, draft, value]);

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (!tag || value.includes(tag) || full) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  };

  const removeTag = (tag: string) => onChange(value.filter((v) => v !== tag));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (!draft.trim()) return;
      e.preventDefault();
      addTag(draft);
      return;
    }
    // Backspace no campo vazio remove a última tag — comportamento esperado
    // de campos de chip, evita ter que mirar no "x".
    if (e.key === "Backspace" && !draft && value.length) {
      e.preventDefault();
      removeTag(value[value.length - 1]!);
    }
  };

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <div
        className={cn(
          "ui-input flex min-h-9 flex-wrap items-center gap-1.5 !h-auto py-1.5",
          disabled && "opacity-60"
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--ui-accent-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--ui-accent)]"
          >
            #{tag}
            {!disabled ? (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={t("tagRemove", { tag })}
                className="transition-opacity hover:opacity-70"
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            ) : null}
          </span>
        ))}
        <input
          value={draft}
          disabled={disabled || full}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim() && addTag(draft)}
          placeholder={full ? t("tagsFull", { max: MAX_TAGS_PER_PERSONA }) : t("tagsPlaceholder")}
          className="min-w-[8rem] flex-1 border-0 bg-transparent p-0 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-dimmer)]"
        />
      </div>

      {open && matches.length > 0 && !full ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[var(--border-color)] bg-[var(--surface-card)] p-1 shadow-lg">
          {matches.map((s) => (
            <button
              key={s.tag}
              type="button"
              // onMouseDown: dispara antes do onBlur do input, senão o blur
              // adicionaria o rascunho e a sugestão nunca seria aplicada.
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s.tag);
              }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[var(--text-main)] transition hover:bg-[var(--surface-bg)]"
            >
              <span>#{s.tag}</span>
              <span className="text-[10px] text-[var(--text-dimmer)]">{s.count}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
