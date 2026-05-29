"use client";

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
      <h1 className="text-lg font-semibold text-slate-900">Algo deu errado</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        {isDb
          ? "Não foi possível conectar ao banco (Supabase). Confira na Vercel se DATABASE_URL está definida (pooler porta 6543 com ?pgbouncer=true) e se as migrations foram aplicadas."
          : "Ocorreu um erro ao carregar a página. Tente novamente."}
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[10px] text-slate-400">{error.digest}</p>
      ) : null}
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
        >
          Tentar de novo
        </button>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Voltar ao login
        </button>
      </div>
    </div>
  );
}
