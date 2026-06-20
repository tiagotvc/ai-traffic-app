import Sidebar from "@/components/Sidebar";
import CommandStrip from "@/components/CommandStrip";
import { ScrollText, ShieldCheck, AlertTriangle, CreditCard, Lock, FileText } from "lucide-react";

const sections = [
  {
    icon: FileText,
    title: "1. Aceitação dos Termos",
    content: `Ao acessar ou usar a plataforma Traffic AI, você concorda em ficar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte dos termos, não poderá acessar o serviço. Estes termos se aplicam a todos os usuários da plataforma, incluindo gestores de tráfego, agências e anunciantes.`,
  },
  {
    icon: Lock,
    title: "2. Descrição do Serviço",
    content: `O Traffic AI é uma plataforma SaaS de gerenciamento de campanhas de marketing digital com insights baseados em inteligência artificial. O serviço oferece centralização de métricas de campanhas, recomendações de IA, dashboards, alertas e integrações com plataformas de anúncios como Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads e outras.`,
  },
  {
    icon: ShieldCheck,
    title: "3. Conta e Segurança",
    content: `Você é responsável por manter a confidencialidade de sua conta e senha. Você concorda em notificar imediatamente o Traffic AI sobre qualquer uso não autorizado de sua conta. O Traffic AI não será responsável por perdas decorrentes do uso não autorizado de sua conta. Você não pode usar a conta de outra pessoa sem permissão.`,
  },
  {
    icon: CreditCard,
    title: "4. Planos e Pagamentos",
    content: `Os planos de assinatura estão disponíveis conforme descrito na página de preços. O faturamento é recorrente (mensal ou anual, conforme o plano escolhido). O cancelamento pode ser realizado a qualquer momento, com efeito ao final do período de cobrança vigente. Não há reembolsos para períodos parcialmente utilizados, salvo disposição legal em contrário.`,
  },
  {
    icon: AlertTriangle,
    title: "5. Uso Aceitável",
    content: `Você concorda em não usar o Traffic AI para: (a) violar leis ou regulamentos aplicáveis; (b) transmitir conteúdo ilegal, prejudicial ou enganoso; (c) tentar obter acesso não autorizado a sistemas ou redes; (d) realizar scraping ou coleta automatizada de dados sem autorização; (e) interferir no funcionamento da plataforma. O descumprimento pode resultar na suspensão ou encerramento da conta.`,
  },
  {
    icon: ScrollText,
    title: "6. Privacidade e LGPD",
    content: `O Traffic AI está em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Coletamos apenas os dados necessários para a operação do serviço. Você tem o direito de acessar, corrigir, exportar ou solicitar a exclusão de seus dados pessoais a qualquer momento. Para exercer esses direitos, entre em contato com nossa equipe de suporte.`,
  },
  {
    icon: ShieldCheck,
    title: "7. Integrações com Terceiros",
    content: `O Traffic AI se integra com plataformas de terceiros como Meta, Google, TikTok, LinkedIn, Pinterest, Shopify e WooCommerce. Ao conectar essas integrações, você autoriza o Traffic AI a acessar dados relevantes de suas contas nessas plataformas. O Traffic AI não é responsável por alterações nos termos ou APIs dessas plataformas de terceiros que possam afetar a disponibilidade das integrações.`,
  },
  {
    icon: AlertTriangle,
    title: "8. Limitação de Responsabilidade",
    content: `O Traffic AI não garante que o serviço estará disponível ininterruptamente ou livre de erros. Em nenhuma circunstância o Traffic AI será responsável por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados ou goodwill. A responsabilidade máxima do Traffic AI é limitada ao valor pago pelo usuário nos últimos 3 meses de serviço.`,
  },
  {
    icon: FileText,
    title: "9. Modificações dos Termos",
    content: `O Traffic AI reserva-se o direito de modificar estes termos a qualquer momento. Notificaremos os usuários sobre alterações significativas por email ou através da plataforma com pelo menos 15 dias de antecedência. O uso continuado do serviço após as alterações constitui aceitação dos novos termos.`,
  },
  {
    icon: ScrollText,
    title: "10. Lei Aplicável e Foro",
    content: `Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa decorrente destes termos será submetida ao foro da Comarca de São Paulo, Estado de São Paulo, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`,
  },
];

export default function Terms() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-bg)" }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <CommandStrip onToggleEmpty={() => {}} isEmptyState={false} />

        <main
          className="flex-1 overflow-y-auto px-4 md:px-8 py-6"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--scrollbar-color) transparent" }}
        >
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div
              className="rounded-2xl p-8 mb-8"
              style={{
                background: "linear-gradient(135deg, rgba(79,70,229,0.08) 0%, rgba(124,58,237,0.06) 100%)",
                border: "1px solid rgba(79,70,229,0.15)",
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  <ScrollText size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="font-heading font-bold text-2xl" style={{ color: "var(--text-main)" }}>
                    Termos de Uso
                  </h1>
                  <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                    Traffic AI — Última atualização: Janeiro de 2025
                  </p>
                </div>
              </div>
              <p style={{ color: "var(--text-dim)" }} className="text-sm leading-relaxed">
                Por favor, leia estes Termos de Uso com atenção antes de usar a plataforma Traffic AI. Estes termos
                constituem um acordo legal entre você e o Traffic AI sobre o uso da plataforma.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {sections.map((section, i) => (
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
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.2)" }}
                    >
                      <section.icon size={16} style={{ color: "#f5a623" }} />
                    </div>
                    <div>
                      <h2
                        className="font-heading font-semibold text-base mb-2"
                        style={{ color: "var(--text-main)" }}
                      >
                        {section.title}
                      </h2>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                        {section.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className="mt-8 rounded-xl p-5 text-center"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-color)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                Dúvidas sobre os termos? Entre em contato:{" "}
                <a href="mailto:legal@trafficai.com.br" className="font-medium underline" style={{ color: "#7c3aed" }}>
                  legal@trafficai.com.br
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}