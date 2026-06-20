import Sidebar from "@/components/Sidebar";
import CommandStrip from "@/components/CommandStrip";
import { Settings as SettingsIcon, Bell, Key, Users, Palette, Shield, Globe, Zap, ChevronRight, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const settingsSections = [
  { id: "general", label: "Geral", icon: SettingsIcon },
  { id: "notifications", label: "Notificações", icon: Bell },
  { id: "integrations", label: "Integrações", icon: Zap },
  { id: "team", label: "Equipe", icon: Users },
  { id: "security", label: "Segurança", icon: Shield },
  { id: "appearance", label: "Aparência", icon: Palette },
];

const teamMembers = [
  { name: "Ana Costa", email: "ana@agencia.com", role: "Agency Lead", avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-6.jpg", status: "active" },
  { name: "Lucas Mendes", email: "lucas@agencia.com", role: "Media Buyer", avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg", status: "active" },
  { name: "Maria Santos", email: "maria@agencia.com", role: "Analyst", avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg", status: "active" },
  { name: "Carlos Oliveira", email: "carlos@agencia.com", role: "Copywriter", avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg", status: "inactive" },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="w-11 h-6 rounded-full relative transition-colors duration-200 flex-shrink-0"
      style={{ background: enabled ? "#f5a623" : "var(--border-hover)" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: enabled ? "translateX(20px)" : "translateX(2px)", left: 0 }}
      />
    </button>
  );
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("general");
  const [notifications, setNotifications] = useState({
    budget: true,
    cpl: true,
    roas: false,
    weekly: true,
    brain: true,
    email: false,
  });

  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-bg)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <CommandStrip onToggleEmpty={() => {}} isEmptyState={false} />

        <main
          className="flex-1 overflow-y-auto px-4 md:px-6 py-5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        >
          {/* Page Header */}
          <div className="mb-5">
            <h1 className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>
              Configurações
            </h1>
            <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>
              Gerencie sua agência e integrações
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-5">
            {/* Settings Sidebar Nav */}
            <div className="w-full md:w-52 flex-shrink-0">
              <div
                className="rounded-xl border p-2"
                style={{
                  background: "var(--surface-card)",
                  borderColor: "var(--border-color)",
                  boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                }}
              >
                <nav className="space-y-0.5">
                  {settingsSections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSection(s.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-body transition-all text-left"
                      )}
                      style={
                        activeSection === s.id
                          ? {
                              background: "rgba(245,166,35,0.08)",
                              color: "#f5a623",
                              borderLeft: "2px solid #f5a623",
                              paddingLeft: "10px",
                              fontWeight: 600,
                            }
                          : {
                              color: "var(--text-dim)",
                              borderLeft: "2px solid transparent",
                              paddingLeft: "10px",
                            }
                      }
                      onMouseEnter={e => {
                        if (activeSection !== s.id) {
                          e.currentTarget.style.background = "var(--row-hover)";
                          e.currentTarget.style.color = "var(--text-main)";
                        }
                      }}
                      onMouseLeave={e => {
                        if (activeSection !== s.id) {
                          e.currentTarget.style.background = "";
                          e.currentTarget.style.color = "var(--text-dim)";
                        }
                      }}
                    >
                      <s.icon size={15} />
                      {s.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* General */}
              {activeSection === "general" && (
                <div
                  className="rounded-xl border p-5"
                  style={{
                    background: "var(--surface-card)",
                    borderColor: "var(--border-color)",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <h2 className="font-heading font-semibold mb-5" style={{ color: "var(--text-main)" }}>
                    Configurações Gerais
                  </h2>
                  <div className="space-y-4">
                    {[
                      { label: "Nome da Agência", value: "AI Traffic App" },
                      { label: "Website", value: "https://aitraffic.app" },
                      { label: "Timezone", value: "America/Sao_Paulo (UTC-3)" },
                      { label: "Moeda Padrão", value: "BRL — Real Brasileiro" },
                    ].map((field) => (
                      <div key={field.label}>
                        <label
                          className="block text-xs font-body font-medium mb-1.5"
                          style={{ color: "var(--text-dim)" }}
                        >
                          {field.label}
                        </label>
                        <input
                          defaultValue={field.value}
                          className="w-full px-3 py-2.5 rounded-lg text-sm font-body transition-colors focus:outline-none"
                          style={{
                            background: "var(--surface-bg)",
                            color: "var(--text-main)",
                            border: "1.5px solid rgba(245,166,35,0.3)",
                          }}
                          onFocus={e => (e.currentTarget.style.borderColor = "rgba(245,166,35,0.7)")}
                          onBlur={e => (e.currentTarget.style.borderColor = "rgba(245,166,35,0.3)")}
                        />
                      </div>
                    ))}
                    <button
                      className="px-5 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all hover:brightness-110"
                      style={{ background: "#f5a623", color: "#0f1419" }}
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeSection === "notifications" && (
                <div
                  className="rounded-xl border p-5"
                  style={{
                    background: "var(--surface-card)",
                    borderColor: "var(--border-color)",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <h2 className="font-heading font-semibold mb-5" style={{ color: "var(--text-main)" }}>
                    Configuração de Alertas
                  </h2>
                  <div className="space-y-0">
                    {[
                      { key: "budget", label: "Alerta de Budget Esgotando", desc: "Notificar quando budget < 15%" },
                      { key: "cpl", label: "Anomalia de CPL", desc: "Alertar quando CPL sobe >30% em 24h" },
                      { key: "roas", label: "ROAS abaixo do Benchmark", desc: "Notificar quando ROAS < 3.0×" },
                      { key: "weekly", label: "Relatório Semanal Automático", desc: "Todo domingo às 22h" },
                      { key: "brain", label: "Insights do Agency Brain", desc: "Notificações de novas sugestões de IA" },
                      { key: "email", label: "Relatórios por Email", desc: "Enviar resumo diário por email" },
                    ].map((n) => (
                      <div
                        key={n.key}
                        className="flex items-center justify-between py-3.5 border-b last:border-0"
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        <div>
                          <p className="font-body text-sm font-medium" style={{ color: "var(--text-main)" }}>
                            {n.label}
                          </p>
                          <p className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>
                            {n.desc}
                          </p>
                        </div>
                        <Toggle
                          enabled={notifications[n.key as keyof typeof notifications]}
                          onChange={() => toggleNotif(n.key as keyof typeof notifications)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Integrations */}
              {activeSection === "integrations" && (
                <div
                  className="rounded-xl border p-5"
                  style={{
                    background: "var(--surface-card)",
                    borderColor: "var(--border-color)",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <h2 className="font-heading font-semibold mb-5" style={{ color: "var(--text-main)" }}>
                    Integrações
                  </h2>
                  <div className="space-y-3">
                    {[
                      { name: "Meta Ads API", status: "connected", accounts: "4 contas ativas", color: "#4f46e5" },
                      { name: "Google Analytics 4", status: "connected", accounts: "2 propriedades", color: "#10b981" },
                      { name: "Slack Notifications", status: "disconnected", accounts: "Não configurado", color: "#94a3b8" },
                      { name: "Zapier Webhooks", status: "disconnected", accounts: "Não configurado", color: "#94a3b8" },
                    ].map((int) => (
                      <div
                        key={int.name}
                        className="flex items-center justify-between p-4 rounded-lg border transition-colors"
                        style={{
                          borderColor: "var(--border-color)",
                          background: "var(--surface-bg)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ background: `${int.color}12` }}
                          >
                            <Globe size={16} style={{ color: int.color }} />
                          </div>
                          <div>
                            <p className="font-body font-medium text-sm" style={{ color: "var(--text-main)" }}>
                              {int.name}
                            </p>
                            <p className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>
                              {int.accounts}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {int.status === "connected" ? (
                            <span
                              className="flex items-center gap-1 text-xs font-body px-2 py-1 rounded-full"
                              style={{ background: "rgba(16,185,129,0.10)", color: "#10b981" }}
                            >
                              <Check size={10} /> Conectado
                            </span>
                          ) : (
                            <button
                              className="text-xs font-body px-3 py-1.5 rounded-lg border transition-colors"
                              style={{
                                color: "var(--text-dim)",
                                borderColor: "rgba(245,166,35,0.35)",
                                background: "var(--surface-card)",
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = "rgba(245,166,35,0.65)";
                                e.currentTarget.style.color = "#f5a623";
                                e.currentTarget.style.background = "rgba(245,166,35,0.06)";
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = "rgba(245,166,35,0.35)";
                                e.currentTarget.style.color = "var(--text-dim)";
                                e.currentTarget.style.background = "var(--surface-card)";
                              }}
                            >
                              Conectar
                            </button>
                          )}
                          <ChevronRight size={14} style={{ color: "var(--text-dimmer)" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team */}
              {activeSection === "team" && (
                <div
                  className="rounded-xl border overflow-hidden"
                  style={{
                    background: "var(--surface-card)",
                    borderColor: "var(--border-color)",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    className="flex items-center justify-between px-5 py-4 border-b"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                    <h2 className="font-heading font-semibold" style={{ color: "var(--text-main)" }}>
                      Membros da Equipe
                    </h2>
                    <button
                      className="text-xs font-body px-3 py-1.5 rounded-lg transition-all hover:brightness-110"
                      style={{ background: "#f5a623", color: "#0f1419" }}
                    >
                      + Convidar
                    </button>
                  </div>
                  {teamMembers.map((member, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-5 py-3.5 border-b last:border-0 transition-colors"
                      style={{ borderColor: "var(--border-color)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--row-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-9 h-9 rounded-full border"
                        style={{ borderColor: "var(--border-hover)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-medium text-sm" style={{ color: "var(--text-main)" }}>
                          {member.name}
                        </p>
                        <p className="text-xs font-body" style={{ color: "var(--text-dimmer)" }}>
                          {member.email}
                        </p>
                      </div>
                      <span
                        className="text-xs font-body px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(79,70,229,0.10)", color: "#4f46e5" }}
                      >
                        {member.role}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: member.status === "active" ? "#10b981" : "var(--text-dimmer)" }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Security / Appearance placeholder */}
              {(activeSection === "security" || activeSection === "appearance") && (
                <div
                  className="rounded-xl border p-8 text-center"
                  style={{
                    background: "var(--surface-card)",
                    borderColor: "var(--border-color)",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: "rgba(245,166,35,0.1)" }}
                  >
                    <Key size={20} style={{ color: "#f5a623" }} />
                  </div>
                  <p className="font-heading font-semibold" style={{ color: "var(--text-main)" }}>
                    Em breve
                  </p>
                  <p className="text-sm font-body mt-1" style={{ color: "var(--text-dim)" }}>
                    Esta seção está em desenvolvimento
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}