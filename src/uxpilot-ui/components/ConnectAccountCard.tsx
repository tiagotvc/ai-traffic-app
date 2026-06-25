"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Facebook, Plus, ArrowRight, CheckCircle2 } from "lucide-react";

import { useRouter } from "@/i18n/navigation";

const steps = [
  { label: "Conectar conta Meta Business", done: false },
  { label: "Selecionar Ad Accounts", done: false },
  { label: "Configurar relatórios automáticos", done: false },
  { label: "Convidar membros da equipe", done: false },
];

const demoModeEnabled = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function ConnectAccountCard() {
  const locale = useLocale();
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);

  const metaOAuthHref = `/api/meta/oauth/start?redirectTo=${encodeURIComponent(`/${locale}/clients/new`)}`;

  async function loadDemo() {
    setDemoLoading(true);
    try {
      const res = await fetch("/api/seed/demo", { method: "POST" });
      if (res.ok) {
        window.dispatchEvent(new Event("traffic:campaigns-reload"));
        router.push("/clients");
        router.refresh();
      }
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden animate-fade-up"
      style={{
        background: "var(--surface-card)",
        border: "1px solid rgba(79,70,229,0.3)",
      }}
    >
      {/* Top Banner */}
      <div
        className="px-6 py-5 flex items-center gap-4"
        style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.15), rgba(79,70,229,0.05))" }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Facebook size={24} style={{ color: "#fff" }} />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg" style={{ color: "var(--text-main)" }}>
            Conecte sua conta Meta
          </h3>
          <p className="text-sm font-body" style={{ color: "var(--text-dim)" }}>
            Configure o AI Traffic App em 4 passos simples
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="px-6 py-5">
        <div className="space-y-3 mb-6">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  border: step.done ? "none" : "1px solid rgba(79,70,229,0.4)",
                  background: step.done ? "#4f46e5" : "transparent",
                }}
              >
                {step.done ? (
                  <CheckCircle2 size={14} style={{ color: "#fff" }} />
                ) : (
                  <span className="text-[11px] font-heading font-semibold" style={{ color: "#818cf8" }}>{i + 1}</span>
                )}
              </div>
              <span
                className="text-sm font-body"
                style={{ color: step.done ? "var(--text-dimmer)" : "var(--text-main)", textDecoration: step.done ? "line-through" : "none" }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href={metaOAuthHref}
          className="w-full py-3 rounded-xl font-heading font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "#fff" }}
        >
          <Plus size={16} />
          Conectar Meta Ads
          <ArrowRight size={16} />
        </a>

        {demoModeEnabled ? (
          <button
            type="button"
            disabled={demoLoading}
            onClick={() => void loadDemo()}
            className="w-full mt-2 py-2 rounded-xl text-sm font-body transition-all hover:opacity-80 disabled:opacity-50"
            style={{ border: "1px solid var(--border-hover)", color: "var(--text-dim)", background: "transparent" }}
          >
            {demoLoading ? "Carregando..." : "Importar dados de demonstração"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
