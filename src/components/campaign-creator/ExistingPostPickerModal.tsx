"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon } from "lucide-react";

import { UxModalPortal } from "@/uxpilot-ui/adapters/UxModalPortal";
import { UxWizardModalPanel } from "@/uxpilot-ui/adapters/ux-wizard-primitives";

type ExistingPost = {
  id: string;
  message?: string;
  caption?: string;
  picture?: string | null;
  permalinkUrl?: string;
  createdTime?: string;
  timestamp?: string;
};

type Props = {
  platform: "facebook" | "instagram";
  clientId: string;
  adAccountId: string;
  pageId: string;
  selectedPostId: string | null;
  onSelect: (postId: string | null) => void;
  disabled?: boolean;
};

const LABELS = {
  facebook: {
    title: "existingPostTitle",
    hint: "existingPostHint",
    noSource: "existingPostNoPage",
    modalTitle: "existingPostModalTitle",
    modalHint: "existingPostModalHint",
    modalEmpty: "existingPostModalEmpty"
  },
  instagram: {
    title: "existingIgPostTitle",
    hint: "existingIgPostHint",
    noSource: "existingIgPostNoAccount",
    modalTitle: "existingIgPostModalTitle",
    modalHint: "existingIgPostModalHint",
    modalEmpty: "existingIgPostModalEmpty"
  }
} as const;

/**
 * Card + modal to promote an already-published Facebook Page post (object_story_id)
 * or Instagram post (source_instagram_media_id) as the ad creative. Self-contained:
 * fetches from /api/meta/ad-posts or /api/meta/ig-posts when the modal opens.
 */
export function ExistingPostCard({
  platform,
  clientId,
  adAccountId,
  pageId,
  selectedPostId,
  onSelect,
  disabled
}: Props) {
  const t = useTranslations("campaignCreator");
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<ExistingPost[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const L = LABELS[platform];
  const endpoint = platform === "instagram" ? "/api/meta/ig-posts" : "/api/meta/ad-posts";
  const postLabel = (p: ExistingPost) => p.message || p.caption || t("existingPostNoText");
  const postDate = (p: ExistingPost) => p.createdTime || p.timestamp;

  const load = useCallback(() => {
    if (!clientId || !adAccountId || !pageId) return;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ clientId, adAccountId, pageId });
    fetch(`${endpoint}?${qs}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setPosts(j.posts as ExistingPost[]);
        else if (j.error === "no_ig_account") setError(t(L.noSource));
        else setError(j.error ?? t("existingPostModalError"));
      })
      .catch(() => setError(t("existingPostModalError")))
      .finally(() => setLoading(false));
  }, [clientId, adAccountId, pageId, endpoint, t]);

  // Reset the cached list whenever the Page changes.
  useEffect(() => {
    setPosts(null);
  }, [pageId]);

  useEffect(() => {
    if (open && posts === null && !loading) load();
  }, [open, posts, loading, load]);

  const selected = posts?.find((p) => p.id === selectedPostId) ?? null;

  return (
    <section className="campaign-creator-card campaign-creator-budget-side-card space-y-3">
      <h4 className="campaign-creator-section-title">{t(L.title)}</h4>

      {!pageId ? (
        <p className="text-xs text-amber-700">{t(L.noSource)}</p>
      ) : (
        <>
          <p className="text-xs text-[var(--text-dim)]">{t(L.hint)}</p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpen(true)}
            className="ui-btn-secondary inline-flex items-center justify-center px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {selectedPostId ? t("existingPostChange") : t("existingPostSelect")}
          </button>

          {selectedPostId ? (
            <div className="flex items-start gap-3 rounded-lg border border-[var(--creator-card-border,var(--border-color))] bg-[var(--creator-card-bg-inset,var(--surface-bg))] p-2">
              {selected?.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.picture}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-[var(--surface-bg)] text-[var(--text-dimmer)]">
                  <ImageIcon size={18} aria-hidden />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs text-[var(--text-main)]">
                  {selected ? postLabel(selected) : t("existingPostNoText")}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-[var(--text-dimmer)]">{selectedPostId}</p>
                <button
                  type="button"
                  onClick={() => onSelect(null)}
                  className="mt-1 text-[11px] text-[var(--violet)] hover:underline"
                >
                  {t("existingPostClear")}
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {open ? (
        <UxModalPortal open={open} onClose={() => setOpen(false)}>
          <UxWizardModalPanel size="lg" className="max-h-[min(640px,92vh)] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-semibold text-[var(--text-main)]">
                  {t(L.modalTitle)}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-dim)]">{t(L.modalHint)}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[var(--text-dimmer)] hover:text-[var(--text-dim)]"
                aria-label={t("existingPostModalClose")}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {loading ? (
                <div
                  className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] px-3 py-3 text-xs text-[var(--text-dim)]"
                  aria-busy="true"
                >
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--ui-accent)] border-t-transparent" />
                  {t("existingPostModalLoading")}
                </div>
              ) : error ? (
                <p className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] px-3 py-4 text-center text-xs text-amber-700">
                  {error}
                </p>
              ) : !posts || posts.length === 0 ? (
                <p className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)] px-3 py-4 text-center text-xs text-[var(--text-dim)]">
                  {t(L.modalEmpty)}
                </p>
              ) : (
                posts.map((post) => {
                  const isSelected = post.id === selectedPostId;
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => {
                        onSelect(post.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${
                        isSelected
                          ? "border-[var(--ui-accent-border)] bg-[var(--ui-accent-muted)]"
                          : "border-[var(--border-color)] hover:bg-[var(--surface-bg)]"
                      }`}
                    >
                      {post.picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.picture}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-bg)] text-[var(--text-dimmer)]">
                          <ImageIcon size={20} aria-hidden />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-3 text-xs text-[var(--text-main)]">
                          {postLabel(post)}
                        </p>
                        {postDate(post) ? (
                          <p className="mt-1 text-[10px] text-[var(--text-dimmer)]">
                            {new Date(postDate(post)!).toLocaleDateString()}
                          </p>
                        ) : null}
                      </div>
                      {isSelected ? (
                        <span className="shrink-0 text-xs font-semibold text-[var(--ui-accent)]">
                          {t("existingPostSelected")}
                        </span>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setOpen(false)} className="ui-btn-primary text-sm">
                {t("existingPostModalDone")}
              </button>
            </div>
          </UxWizardModalPanel>
        </UxModalPortal>
      ) : null}
    </section>
  );
}
