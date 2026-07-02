import { cn } from "@/lib/cn";

/** Fundo premium compartilhado por login, planos e checkout. */
export function BillingAtmosphere({ fixed = false }: { fixed?: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none inset-0 -z-10 overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950",
        fixed ? "fixed" : "absolute"
      )}
    >
      <div className="auth-premium-grid" />
      <div
        className="auth-premium-glow -right-24 -top-24 h-96 w-96"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)" }}
      />
      <div className="auth-premium-glow -bottom-32 -left-20 h-80 w-80 bg-violet-500/15" />
    </div>
  );
}
