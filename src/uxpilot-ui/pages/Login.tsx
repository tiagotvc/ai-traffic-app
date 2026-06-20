"use client";

import { useState } from "react";
import { Link, useUxNavigate as useNavigate } from "@/uxpilot-ui/adapters/navigation";
import { Zap, Eye, EyeOff, Facebook } from "lucide-react";
import { cn } from "@/uxpilot-ui/lib/utils";

type Tab = "login" | "signup";

export default function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;
    navigate("/dashboard");
  };

  const inputClass =
    "w-full px-4 py-2.5 rounded-lg border text-sm font-body outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 bg-white text-gray-900 placeholder-gray-400";
  const inputStyle = { borderColor: "#d4880a33" };

  return (
    <div className="min-h-screen flex" style={{ background: "#F8FAFC" }}>
      {/* Left Panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[46%] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(150deg, #3730a3 0%, #4f46e5 40%, #7c3aed 100%)" }}
      >
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 right-10 w-64 h-64 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #f5a623 0%, transparent 70%)" }} />
          <div className="absolute bottom-40 left-6 w-48 h-48 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <p className="font-heading font-bold text-white text-lg leading-tight">Traffic AI</p>
            <p className="text-xs leading-tight" style={{ color: "#fbbf24" }}>Ads Manager</p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10">
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-6"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fde68a", border: "1px solid rgba(255,255,255,0.2)" }}>
            Plataforma para gestores de tráfego
          </span>
          <h1 className="font-heading font-bold text-white text-4xl leading-tight mb-4">
            Escale campanhas com dados, não com achismo.
          </h1>
          <p className="text-indigo-200 text-base leading-relaxed mb-8">
            Ranking de criativos, métricas ao vivo e conexão Meta Business — tudo num só lugar para você e sua equipe.
          </p>

          <div className="space-y-4">
            {[
              { icon: "📊", text: "Ranking de criativos e métricas em tempo real" },
              { icon: "🔗", text: "Conecte Meta Business em poucos passos" },
              { icon: "🔒", text: "Login seguro com Google ou Facebook" },
              { icon: "🔔", text: "Alertas, relatórios e automações para sua operação" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-indigo-100">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="relative z-10 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <div className="flex items-center gap-4">
            <div>
              <p className="font-heading font-bold text-white text-2xl">10×</p>
              <p className="text-xs text-indigo-200">mais rápido para achar criativos vencedores</p>
            </div>
            <div className="h-10 w-px" style={{ background: "rgba(255,255,255,0.2)" }} />
            <p className="text-sm text-indigo-100 flex-1">
              Feito para agências e gestores que gerenciam múltiplos clientes na Meta.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
        {/* Mobile Logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
            <Zap size={16} className="text-white" />
          </div>
          <p className="font-heading font-bold text-gray-900 text-base">Traffic AI</p>
        </div>

        <div className="w-full max-w-md">
          {/* Tab Toggle */}
          <div
            className="flex rounded-xl p-1 mb-8"
            style={{ background: "#f1f5f9", border: "1px solid #e2e8f0" }}
          >
            {(["login", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-semibold font-body transition-all duration-200",
                  tab === t
                    ? "text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
                style={
                  tab === t
                    ? { background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }
                    : {}
                }
              >
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          {/* LOGIN FORM */}
          {tab === "login" && (
            <div>
              <h2 className="font-heading font-bold text-gray-900 text-2xl mb-1">Entrar</h2>
              <p className="text-sm text-gray-500 mb-6">
                Acesse a plataforma com email e senha.
              </p>

              {/* Facebook Button */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 mb-4"
                style={{ background: "#1877F2" }}
              >
                <Facebook size={18} />
                Continuar com Facebook
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
                <span className="text-xs text-gray-400">ou continue com email</span>
                <div className="flex-1 h-px" style={{ background: "#e2e8f0" }} />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className={inputClass}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">Senha</label>
                    <button type="button" className="text-xs font-medium" style={{ color: "#7c3aed" }}>
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                      style={inputStyle}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] mt-2"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  Entrar
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                Meta Business pode ser conectada depois em Configurações.
              </p>
            </div>
          )}

          {/* SIGNUP FORM */}
          {tab === "signup" && (
            <div>
              <h2 className="font-heading font-bold text-gray-900 text-2xl mb-1">Criar conta</h2>
              <p className="text-sm text-gray-500 mb-6">
                Comece gratuitamente. Sem cartão de crédito.
              </p>

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                  <input
                    type="text"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="Seu nome"
                    className={inputClass}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className={inputClass}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className={inputClass}
                      style={inputStyle}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={signupConfirm}
                      onChange={(e) => setSignupConfirm(e.target.value)}
                      placeholder="Repita sua senha"
                      className={inputClass}
                      style={inputStyle}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded cursor-pointer accent-violet-600"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600 leading-snug cursor-pointer">
                    Li e aceito os{" "}
                    <Link
                      to="/terms"
                      className="font-semibold underline underline-offset-2 hover:opacity-80"
                      style={{ color: "#7c3aed" }}
                      target="_blank"
                    >
                      Termos de Uso
                    </Link>{" "}
                    e confirmo que tenho pelo menos 18 anos.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!termsAccepted}
                  className={cn(
                    "w-full py-3 rounded-xl text-sm font-bold text-white transition-all mt-2",
                    termsAccepted
                      ? "hover:opacity-90 active:scale-[0.98]"
                      : "opacity-50 cursor-not-allowed"
                  )}
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  Criar conta
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-4">
                Ao criar sua conta, você concorda com nossa{" "}
                <Link to="/terms" className="underline hover:text-gray-600" target="_blank">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}