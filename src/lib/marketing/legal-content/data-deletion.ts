import { LEGAL_CONTACT } from "@/lib/marketing/legal-contact";
import type { LegalLocale, LegalPageContent } from "@/lib/marketing/legal-content/types";

const pt: LegalPageContent = {
  badge: "Meta / LGPD",
  title: "Instruções de Exclusão de Dados",
  subtitle: "Como solicitar a remoção dos seus dados no Traffic AI",
  intro:
    "Esta página atende aos requisitos da Meta (Facebook) e da LGPD para exclusão de dados pessoais e desconexão de integrações.",
  sections: [
    {
      title: "1. O que será excluído",
      paragraphs: ["Ao solicitar exclusão, podemos remover ou anonimizar:"],
      bullets: [
        "Dados da sua conta (nome, e-mail, preferências)",
        "Tokens OAuth e vínculos com Meta/Google",
        "Métricas e históricos sincronizados associados à sua conta",
        "Configurações de dashboard, relatórios e automações"
      ]
    },
    {
      title: "2. Como solicitar pela plataforma",
      paragraphs: [
        "Usuários logados podem acessar estas instruções a qualquer momento em Institucional → Exclusão de Dados no menu lateral (rota /legal/data-deletion).",
        "Envie e-mail para " + LEGAL_CONTACT.privacyEmail + " com assunto \"Exclusão de dados\" informando o e-mail cadastrado.",
        "Confirmaremos sua identidade antes de processar a solicitação.",
        "O prazo de conclusão é de até 30 dias, salvo complexidade adicional ou exigências legais de retenção."
      ]
    },
    {
      title: "3. Revogar acesso Meta (Facebook)",
      paragraphs: [
        "Você também pode remover o Traffic AI diretamente na Meta:",
        "1. Acesse facebook.com/settings/applications",
        "2. Localize Traffic AI / Orion Agency",
        "3. Clique em \"Remover\" ou \"Revogar acesso\"",
        "Isso interrompe novas sincronizações. Para excluir dados já armazenados conosco, envie também o pedido por e-mail."
      ]
    },
    {
      title: "4. Callback de exclusão da Meta",
      paragraphs: [
        "Quando você remove o app pela Meta, a plataforma Meta pode enviar uma solicitação automática de exclusão ao nosso endpoint oficial.",
        "Após processamento, fornecemos um código de confirmação e URL de status conforme exigido pela Meta.",
        "Endpoint: POST /api/meta/data-deletion (configurado no painel de desenvolvedor Meta)."
      ]
    },
    {
      title: "5. Cancelamento de assinatura vs. exclusão",
      paragraphs: [
        "Cancelar a assinatura encerra cobranças futuras, mas não remove automaticamente todos os dados.",
        "Para exclusão completa, solicite explicitamente conforme esta página."
      ]
    },
    {
      title: "6. Contato",
      paragraphs: [
        `Privacidade / exclusão: ${LEGAL_CONTACT.privacyEmail}`,
        `Suporte: ${LEGAL_CONTACT.supportEmail}`,
        `Localização: ${LEGAL_CONTACT.companyLocation}`
      ]
    }
  ]
};

const en: LegalPageContent = {
  badge: "Meta / LGPD",
  title: "Data Deletion Instructions",
  subtitle: "How to request removal of your Traffic AI data",
  intro:
    "This page meets Meta (Facebook) and LGPD requirements for personal data deletion and integration disconnection.",
  sections: [
    {
      title: "1. What will be deleted",
      paragraphs: ["Upon request, we may remove or anonymize:"],
      bullets: [
        "Account data (name, email, preferences)",
        "OAuth tokens and Meta/Google links",
        "Synced metrics and history tied to your account",
        "Dashboard, report, and automation settings"
      ]
    },
    {
      title: "2. How to request via the platform",
      paragraphs: [
        "Logged-in users can open these instructions anytime via Legal → Data Deletion in the sidebar (/legal/data-deletion).",
        `Email ${LEGAL_CONTACT.privacyEmail} with subject \"Data deletion\" and your registered email.`,
        "We will verify your identity before processing.",
        "Completion within 30 days unless legal retention or complexity requires more time."
      ]
    },
    {
      title: "3. Revoke Meta (Facebook) access",
      paragraphs: [
        "Remove Traffic AI directly on Meta:",
        "1. Go to facebook.com/settings/applications",
        "2. Find Traffic AI",
        "3. Click Remove or Revoke access",
        "This stops new syncs. Email us to delete data already stored on our side."
      ]
    },
    {
      title: "4. Meta deletion callback",
      paragraphs: [
        "When you remove the app on Meta, Meta may send an automatic deletion request to our official endpoint.",
        "After processing, we provide a confirmation code and status URL as required by Meta.",
        "Endpoint: POST /api/meta/data-deletion (configured in Meta Developer Dashboard)."
      ]
    },
    {
      title: "5. Cancel subscription vs. deletion",
      paragraphs: [
        "Canceling subscription stops future charges but does not automatically delete all data.",
        "Request explicit deletion using this page."
      ]
    },
    {
      title: "6. Contact",
      paragraphs: [
        `Privacy / deletion: ${LEGAL_CONTACT.privacyEmail}`,
        `Support: ${LEGAL_CONTACT.supportEmail}`,
        `Location: ${LEGAL_CONTACT.companyLocation}`
      ]
    }
  ]
};

export const dataDeletionContent: Record<LegalLocale, LegalPageContent> = { "pt-BR": pt, en };

export function getDataDeletionContent(locale: string): LegalPageContent {
  return dataDeletionContent[locale === "en" ? "en" : "pt-BR"];
}
