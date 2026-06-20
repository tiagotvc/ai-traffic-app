"use client";

import { useState } from "react";
import Sidebar from "@/uxpilot-ui/components/Sidebar";
import CommandStrip from "@/uxpilot-ui/components/CommandStrip";
import {
  MessageCircle,
  Mail,
  ChevronDown,
  ChevronUp,
  Send,
  Clock,
  CheckCircle,
  BookOpen,
  Zap,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/uxpilot-ui/lib/utils";

const faqs = [
  {
    question: "Como conecto minha conta Meta Business ao Traffic AI?",
    answer:
      "Acesse Configurações → Integrações → Meta Ads e clique em 'Conectar conta'. Você será redirecionado para autorizar o acesso via OAuth do Facebook. Após a autorização, suas campanhas serão sincronizadas automaticamente em até 15 minutos.",
  },
  {
    question: "O Traffic AI suporta múltiplos clientes em uma só conta?",
    answer:
      "Sim! O Traffic AI foi desenvolvido especificamente para agências que gerenciam múltiplos clientes. Na seção 'Clientes', você pode criar perfis separados para cada cliente, cada um com suas próprias integrações, campanhas e relatórios.",
  },
  {
    question: "Com que frequência os dados são atualizados?",
    answer:
      "Os dados são atualizados a cada hora para métricas de campanhas ativas. O dashboard principal reflete dados das últimas 24h. Para relatórios históricos, os dados são processados diariamente às 00h (horário de Brasília). Em planos Enterprise, é possível configurar atualizações em tempo real.",
  },
  {
    question: "Posso exportar relatórios em PDF ou Excel?",
    answer:
      "Sim. Na seção 'Relatórios', selecione o período e as métricas desejadas e clique em 'Exportar'. Estão disponíveis os formatos PDF, XLSX (Excel) e CSV. Você também pode configurar relatórios automáticos por email para clientes.",
  },
  {
    question: "O que é o Agency Brain e como funciona?",
    answer:
      "O Agency Brain é nossa feature de inteligência artificial que analisa o histórico de campanhas e identifica padrões de performance, criativos vencedores, públicos mais rentáveis e oportunidades de otimização. Ele gera recomendações acionáveis diretamente no dashboard, classificadas por impacto estimado.",
  },
  {
    question: "Como funciona o cancelamento da assinatura?",
    answer:
      "Você pode cancelar a qualquer momento em Configurações → Plano e Cobrança → Cancelar assinatura. O cancelamento tem efeito ao final do período de cobrança vigente e você mantém acesso a todos os recursos até lá. Não cobramos taxas de cancelamento.",
  },
  {
    question: "O Traffic AI é compatível com Google Tag Manager?",
    answer:
      "Sim. O Traffic AI se integra ao Google Tag Manager e Google Analytics 4, permitindo correlacionar dados de comportamento no site com performance de campanhas. A configuração é feita em Configurações → Integrações → Google Analytics.",
  },
  {
    question: "Como configurar alertas automáticos?",
    answer:
      "Acesse a seção 'Alertas' e clique em 'Novo Alerta'. Você pode configurar alertas por métricas como CPA acima de um limite, CTR abaixo do esperado, orçamento diário esgotado, entre outros. Os alertas podem ser enviados por email, notificação na plataforma ou via webhook.",
  },
];

const contactChannels = [
  {
    icon: MessageCircle,
    title: "Chat ao Vivo",
    description: "Resposta imediata com nossa equipe de suporte",
    availability: "Seg–Sex, 9h–18h",
    color: "#7c3aed",
    action: "Iniciar chat",
  },
  {
    icon: Mail,
    title: "Email",
    description: "Para solicitações detalhadas e não urgentes",
    availability: "Resposta em até 24h",
    color: "#f5a623",
    action: "suporte@trafficai.com.br",
  },
  {
    icon: BookOpen,
    title: "Documentação",
    description: "Guias completos, tutoriais e referência de API",
    availability: "Sempre disponível",
    color: "#10b981",
    action: "Acessar docs",
  },
];

const inputClass =
  "w-full px-4 py-2.5 rounded-xl text-sm font-body outline-none transition-all bg-transparent";

export default function Support() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setFormData({ name: "", email: "", subject: "", category: "", message: "" });
  };

  const inputStyle = {
    border: "1px solid rgba(245,166,35,0.25)",
    background: "var(--input-bg)",
    color: "var(--text-main)",
  };

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

            {/* Header */}
            <div
              className="rounded-2xl p-8 relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #3730a3 0%, #4f46e5 50%, #7c3aed 100%)",
              }}
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-6 right-16 w-40 h-40 rounded-full opacity-10"
                  style={{ background: "radial-gradient(circle, #f5a623 0%, transparent 70%)" }} />
              </div>
              <div className="relative z-10 flex items-center gap-4 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
                >
                  <LifeBuoy size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="font-heading font-bold text-white text-2xl">Suporte & Contato</h1>
                  <p className="text-indigo-200 text-sm">Estamos aqui para ajudar</p>
                </div>
              </div>
              <p className="text-indigo-100 text-sm leading-relaxed relative z-10">
                Nossa equipe de suporte está disponível para resolver suas dúvidas e garantir que você
                aproveite ao máximo o Traffic AI.
              </p>
            </div>

            {/* Contact Channels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {contactChannels.map((ch, i) => (
                <div
                  key={i}
                  className="rounded-xl p-5"
                  style={{
                    background: "var(--surface-card)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: `${ch.color}14`, border: `1px solid ${ch.color}30` }}
                  >
                    <ch.icon size={18} style={{ color: ch.color }} />
                  </div>
                  <h3 className="font-heading font-semibold text-sm mb-1" style={{ color: "var(--text-main)" }}>
                    {ch.title}
                  </h3>
                  <p className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>{ch.description}</p>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Clock size={11} style={{ color: "var(--text-dimmer)" }} />
                    <span className="text-[11px]" style={{ color: "var(--text-dimmer)" }}>{ch.availability}</span>
                  </div>
                  <span
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg inline-block"
                    style={{ background: `${ch.color}14`, color: ch.color, border: `1px solid ${ch.color}25` }}
                  >
                    {ch.action}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contact Form */}
              <div
                className="rounded-2xl p-6"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <div className="flex items-center gap-3 mb-5">
                  <Send size={18} style={{ color: "#f5a623" }} />
                  <h2 className="font-heading font-bold text-lg" style={{ color: "var(--text-main)" }}>
                    Enviar Mensagem
                  </h2>
                </div>

                {submitted ? (
                  <div
                    className="flex flex-col items-center justify-center py-10 text-center"
                  >
                    <CheckCircle size={40} className="mb-4" style={{ color: "#10b981" }} />
                    <h3 className="font-heading font-semibold text-base mb-2" style={{ color: "var(--text-main)" }}>
                      Mensagem enviada!
                    </h3>
                    <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                      Nossa equipe entrará em contato em até 24h.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>
                          Nome *
                        </label>
                        <input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Seu nome"
                          className={inputClass}
                          style={inputStyle}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="seu@email.com"
                          className={inputClass}
                          style={inputStyle}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>
                        Categoria
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className={inputClass}
                        style={inputStyle}
                      >
                        <option value="">Selecione uma categoria</option>
                        <option value="integration">Integrações</option>
                        <option value="billing">Cobrança e Planos</option>
                        <option value="technical">Problema Técnico</option>
                        <option value="feature">Sugestão de Funcionalidade</option>
                        <option value="account">Conta e Acesso</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>
                        Assunto *
                      </label>
                      <input
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="Descreva brevemente o assunto"
                        className={inputClass}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-dim)" }}>
                        Mensagem *
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Descreva sua dúvida ou problema em detalhes..."
                        rows={5}
                        className={inputClass}
                        style={{ ...inputStyle, resize: "none" }}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
                      style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                    >
                      <Send size={15} />
                      Enviar mensagem
                    </button>
                  </form>
                )}
              </div>

              {/* FAQ */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <Zap size={18} style={{ color: "#f5a623" }} />
                  <h2 className="font-heading font-bold text-lg" style={{ color: "var(--text-main)" }}>
                    Perguntas Frequentes
                  </h2>
                </div>
                <div className="space-y-2">
                  {faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="rounded-xl overflow-hidden transition-all"
                      style={{
                        background: "var(--surface-card)",
                        border: openFaq === i
                          ? "1px solid rgba(245,166,35,0.35)"
                          : "1px solid var(--border-color)",
                      }}
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
                      >
                        <span
                          className={cn(
                            "font-body text-sm font-medium leading-snug",
                            openFaq === i ? "" : ""
                          )}
                          style={{ color: openFaq === i ? "#f5a623" : "var(--text-main)" }}
                        >
                          {faq.question}
                        </span>
                        {openFaq === i ? (
                          <ChevronUp size={15} className="flex-shrink-0" style={{ color: "#f5a623" }} />
                        ) : (
                          <ChevronDown size={15} className="flex-shrink-0" style={{ color: "var(--text-dimmer)" }} />
                        )}
                      </button>
                      {openFaq === i && (
                        <div
                          className="px-4 pb-4 text-xs leading-relaxed"
                          style={{ color: "var(--text-dim)", borderTop: "1px solid var(--border-color)" }}
                        >
                          <p className="pt-3">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}