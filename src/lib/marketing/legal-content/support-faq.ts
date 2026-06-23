import type { LegalLocale } from "@/lib/marketing/legal-content/types";

export type SupportFaq = { question: string; answer: string };

const pt: SupportFaq[] = [
  {
    question: "O que é o Traffic AI?",
    answer:
      "O Traffic AI é uma plataforma de análise e inteligência para gestores de tráfego e agências que utilizam Meta Ads."
  },
  {
    question: "O Traffic AI substitui um gestor de tráfego?",
    answer:
      "Não. A plataforma foi criada para auxiliar profissionais através de análises, aprendizados e recomendações, ajudando na tomada de decisões."
  },
  {
    question: "Quais plataformas são suportadas atualmente?",
    answer:
      "Atualmente o Traffic AI oferece integração com Meta Ads. Novas integrações poderão ser adicionadas futuramente."
  },
  {
    question: "Meus dados estão seguros?",
    answer:
      "Sim. Utilizamos criptografia, boas práticas de segurança e controles de acesso para proteger as informações armazenadas na plataforma."
  },
  {
    question: "Posso cancelar quando quiser?",
    answer: "Sim. O cancelamento pode ser realizado a qualquer momento conforme as condições do plano contratado."
  },
  {
    question: "Como excluo meus dados ou revogo a Meta?",
    answer:
      "Consulte a página de Instruções de Exclusão de Dados ou escreva para privacidade@trafficai.com.br."
  }
];

const en: SupportFaq[] = [
  {
    question: "What is Traffic AI?",
    answer:
      "Traffic AI is an analytics and intelligence platform for traffic managers and agencies using Meta Ads."
  },
  {
    question: "Does Traffic AI replace a traffic manager?",
    answer:
      "No. It assists professionals with analysis, learnings, and recommendations to support decision-making."
  },
  {
    question: "Which platforms are supported?",
    answer: "Traffic AI currently integrates with Meta Ads. More integrations may be added in the future."
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We use encryption, security best practices, and access controls to protect stored information."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. You may cancel according to your plan terms at any time."
  },
  {
    question: "How do I delete my data or revoke Meta?",
    answer: "See the Data Deletion Instructions page or email privacidade@trafficai.com.br."
  }
];

export function getSupportFaqs(locale: string): SupportFaq[] {
  return locale === "en" ? en : pt;
}
