"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { useRouter } from "@/i18n/navigation";

export function SignOutButton({
  variant = "default",
  collapsed = false
}: {
  variant?: "default" | "sidebar";
  collapsed?: boolean;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const className =
    variant === "sidebar"
      ? collapsed
        ? "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-60"
        : "w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-60"
      : "mt-3 w-full rounded-xl border border-surface-line bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60";

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
          router.replace("/login");
        })
      }
      className={className}
    >
      {variant === "sidebar" && collapsed ? "⎋" : isPending ? t("signingOut") : t("signOut")}
    </button>
  );
}
