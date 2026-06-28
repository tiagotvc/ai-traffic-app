"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { useRouter } from "@/i18n/navigation";

export default function AppError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const tf = useTranslations("appFeedback");
  const isDb =
    error.message.includes("DATABASE_URL") ||
    error.message.includes("connect") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("certificate");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-heading text-lg font-semibold text-[var(--text-main)]">{tf("somethingWrong")}</h1>
      <p className="mt-2 max-w-md text-sm text-[var(--text-dim)]">
        {isDb ? tf("dbConnectionError") : tf("pageLoadError")}
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[10px] text-[var(--text-dimmer)]">{error.digest}</p>
      ) : null}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="ui-btn-primary"
        >
          {tf("tryAgain")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="ui-btn-secondary"
        >
          {tf("backToLogin")}
        </button>
      </div>
    </div>
  );
}
