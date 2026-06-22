import { LoginMarketingSlider } from "@/components/auth/LoginMarketingSlider";
import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";

export function LoginMarketingPanel() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 p-8 text-white xl:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }}
      />
      <div
        className="pointer-events-none absolute -right-16 top-0 h-80 w-80 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(245,166,35,0.16) 0%, transparent 65%)" }}
      />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <header className="relative z-10 shrink-0 pb-6">
        <OrionAgencyLogo size="lg" variant="dark" />
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <LoginMarketingSlider />
      </div>
    </div>
  );
}
