/** Grupo de rotas full-screen (sem sidebar/chrome do app) — hoje só o checkout. Público: quem não
 * tem sessão pode acessar direto (a rota de checkout cria conta+tenant na hora, sem /login).
 * Mesmo fundo/grade/glow do login (.auth-premium-*, ver globals.css) pra manter a identidade. */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden text-[#f8fafc]" style={{ backgroundColor: "#0a0f14" }}>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 top-0 h-72 w-72 rounded-full blur-[64px]"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-violet-500/15 blur-[64px]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
