import Sidebar from "@/uxpilot-ui/components/Sidebar";
import CommandStrip from "@/uxpilot-ui/components/CommandStrip";
import { Zap, Target, Users, Brain, TrendingUp, Globe, Shield, Award } from "lucide-react";

const values = [
  {
    icon: Brain,
    title: "Inteligência Artificial",
    description: "Usamos IA para transformar dados brutos em insights acionáveis, ajudando gestores a tomar decisões mais rápidas e precisas.",
  },
  {
    icon: Target,
    title: "Foco em Performance",
    description: "Cada funcionalidade da plataforma foi projetada para otimizar o desempenho de campanhas e maximizar o retorno sobre investimento.",
  },
  {
    icon: Users,
    title: "Colaboração em Equipe",
    description: "Facilitamos o trabalho em equipe para agências que gerenciam múltiplos clientes, com acesso centralizado e compartilhamento de dados.",
  },
  {
    icon: Shield,
    title: "Segurança e Privacidade",
    description: "Seguimos rigorosamente a LGPD e as melhores práticas de segurança para proteger os dados de nossos clientes.",
  },
];

const integrations = [
  { name: "Meta Ads", color: "#1877F2" },
  { name: "Google Ads", color: "#4285F4" },
  { name: "TikTok Ads", color: "#010101" },
  { name: "LinkedIn Ads", color: "#0A66C2" },
  { name: "Pinterest Ads", color: "#E60023" },
  { name: "Google Analytics", color: "#E37400" },
  { name: "Shopify", color: "#95BF47" },
  { name: "WooCommerce", color: "#7F54B3" },
];

const team = [
  {
    name: "Carlos Mendes",
    role: "CEO & Co-Founder",
    avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg",
    bio: "10 anos de experiência em marketing digital e gestão de tráfego para grandes marcas.",
  },
  {
    name: "Ana Costa",
    role: "CTO & Co-Founder",
    avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg",
    bio: "Engenheira de software especializada em IA e sistemas de dados em tempo real.",
  },
  {
    name: "Rafael Lima",
    role: "Head of Product",
    avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-3.jpg",
    bio: "Designer de produto apaixonado por criar experiências que simplificam a complexidade.",
  },
  {
    name: "Juliana Ferreira",
    role: "Head of Customer Success",
    avatar: "https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-5.jpg",
    bio: "Especialista em onboarding e sucesso do cliente, garantindo resultados mensuráveis.",
  },
];

const stats = [
  { value: "2.500+", label: "Agências ativas" },
  { value: "R$1,2B+", label: "Em budget gerenciado" },
  { value: "10×", label: "Mais rápido na análise" },
  { value: "99,9%", label: "Uptime garantido" },
];

export default function About() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-bg)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <CommandStrip onToggleEmpty={() => {}} isEmptyState={false} />

        <main
          className="flex-1 overflow-y-auto px-4 md:px-8 py-6"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        >
          <div className="max-w-4xl mx-auto space-y-8">

            {/* Hero */}
            <div
              className="rounded-2xl p-8 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #7c3aed 100%)",
              }}
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-8 right-12 w-48 h-48 rounded-full opacity-10"
                  style={{ background: "radial-gradient(circle, #f5a623 0%, transparent 70%)" }} />
              </div>
              <div className="relative z-10 flex items-center gap-4 mb-6">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
                >
                  <Zap size={26} className="text-white" />
                </div>
                <div>
                  <h1 className="font-heading font-bold text-white text-3xl">Traffic AI</h1>
                  <p className="text-indigo-200 text-sm">A plataforma do gestor de tráfego moderno</p>
                </div>
              </div>
              <p className="text-indigo-100 text-base leading-relaxed relative z-10 max-w-2xl">
                Fundada em 2022, o Traffic AI nasceu da frustração de gestores de tráfego que gastavam horas
                acessando múltiplas plataformas para reunir dados. Nossa missão é centralizar, automatizar e
                inteligir a gestão de campanhas digitais.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="rounded-xl p-5 text-center"
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <p className="font-heading font-bold text-2xl mb-1" style={{ color: "#f5a623" }}>
                    {stat.value}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-dim)" }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Mission */}
            <div
              className="rounded-2xl p-8"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp size={20} style={{ color: "#f5a623" }} />
                <h2 className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>
                  Nossa Missão
                </h2>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-dim)" }}>
                Acreditamos que decisões de marketing devem ser guiadas por dados, não por intuição. O Traffic AI
                foi criado para democratizar o acesso a inteligência artificial aplicada ao tráfego pago, permitindo
                que agências de todos os tamanhos compitam com o mesmo nível de insight das grandes empresas.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                Nossa plataforma consolida métricas de todas as principais plataformas de anúncios em um único
                dashboard inteligente, com alertas automatizados, ranking de criativos e recomendações de otimização
                baseadas em IA. O resultado: menos tempo analisando, mais tempo otimizando.
              </p>
            </div>

            {/* Values */}
            <div>
              <h2 className="font-heading font-bold text-xl mb-4" style={{ color: "var(--text-main)" }}>
                Nossos Valores
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {values.map((value, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-6"
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "linear-gradient(135deg, rgba(79,70,229,0.1), rgba(124,58,237,0.08))",
                          border: "1px solid rgba(79,70,229,0.2)",
                        }}
                      >
                        <value.icon size={18} style={{ color: "#7c3aed" }} />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-sm mb-1.5" style={{ color: "var(--text-main)" }}>
                          {value.title}
                        </h3>
                        <p className="text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
                          {value.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Users size={20} style={{ color: "#f5a623" }} />
                <h2 className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>
                  Nosso Time
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {team.map((member, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-5 flex items-start gap-4"
                    style={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-full flex-shrink-0 object-cover"
                      style={{ border: "2px solid rgba(245,166,35,0.3)" }}
                    />
                    <div>
                      <p className="font-heading font-semibold text-sm" style={{ color: "var(--text-main)" }}>
                        {member.name}
                      </p>
                      <p className="text-xs font-medium mb-1.5" style={{ color: "#7c3aed" }}>{member.role}</p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--text-dim)" }}>
                        {member.bio}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Integrations */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <Globe size={20} style={{ color: "#f5a623" }} />
                <h2 className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>
                  Integrações Disponíveis
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {integrations.map((int, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{
                      background: `${int.color}14`,
                      color: int.color,
                      border: `1px solid ${int.color}30`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: int.color }}
                    />
                    {int.name}
                  </span>
                ))}
              </div>
              <p className="text-xs mt-4" style={{ color: "var(--text-dim)" }}>
                Em constante expansão. Novas integrações são adicionadas regularmente com base no feedback da comunidade.
              </p>
            </div>

            {/* Awards / Compliance */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: "linear-gradient(135deg, rgba(245,166,35,0.06) 0%, rgba(245,166,35,0.03) 100%)",
                border: "1px solid rgba(245,166,35,0.15)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Award size={20} style={{ color: "#f5a623" }} />
                <h2 className="font-heading font-bold text-base" style={{ color: "var(--text-main)" }}>
                  Conformidade e Certificações
                </h2>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                O Traffic AI é certificado em conformidade com a <strong style={{ color: "var(--text-main)" }}>LGPD (Lei nº 13.709/2018)</strong>,
                aplica criptografia de dados em repouso e em trânsito, e passa por auditorias de segurança regulares.
                Somos parceiros oficiais da Meta, Google e TikTok para acesso à API de anúncios.
              </p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}