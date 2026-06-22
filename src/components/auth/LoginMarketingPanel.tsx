import { LoginMarketingSlider } from "@/components/auth/LoginMarketingSlider";
import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";

export function LoginMarketingPanel() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-8 text-white xl:p-10">
      <div className="auth-premium-grid" />
      <div
        className="auth-premium-glow -right-24 -top-24 h-96 w-96"
        style={{ background: "radial-gradient(circle, rgba(245,166,35,0.15) 0%, transparent 65%)" }}
      />
      <div className="auth-premium-glow -bottom-32 left-0 h-80 w-80 bg-violet-500/15" />

      <header className="relative z-10 shrink-0 pb-6">
        <OrionAgencyLogo size="lg" variant="dark" />
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <LoginMarketingSlider />
      </div>
    </div>
  );
}
