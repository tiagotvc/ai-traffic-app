import { LEGAL_CONTACT } from "@/lib/marketing/legal-contact";
import type { LegalLocale, LegalPageContent } from "@/lib/marketing/legal-content/types";

const pt: LegalPageContent = {
  badge: "Privacidade",
  title: "Política de Privacidade",
  subtitle: `Última atualização: ${LEGAL_CONTACT.termsUpdatedDate}`,
  intro:
    'O Traffic AI ("Traffic AI", "nós", "nosso" ou "plataforma") respeita a privacidade de seus usuários e está comprometido com a proteção dos dados pessoais tratados durante a utilização de nossos serviços. Ao utilizar a plataforma, você declara estar ciente das práticas descritas nesta Política, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD) e demais legislações aplicáveis.',
  sections: [
    {
      title: "1. Introdução",
      paragraphs: [
        "Esta Política de Privacidade explica quais informações coletamos, como as utilizamos, com quem podemos compartilhá-las e quais direitos você possui em relação aos seus dados.",
        "Para solicitar exclusão de dados ou revogar integrações, consulte também nossas Instruções de Exclusão de Dados em /data-deletion."
      ]
    },
    {
      title: "2. Quem somos",
      paragraphs: [
        `O Traffic AI é uma plataforma especializada em análise, monitoramento, automação e geração de insights para campanhas de marketing digital, operada a partir de ${LEGAL_CONTACT.companyLocation}.`,
        "Nossos serviços podem incluir:"
      ],
      bullets: [
        "Análise de campanhas publicitárias",
        "Monitoramento de métricas",
        "Geração de relatórios",
        "Recomendações por inteligência artificial",
        "Gestão de contas de anúncios",
        "Centralização de dados de múltiplas plataformas",
        "Alertas e aprendizados automatizados",
        "Recursos de automação e otimização de campanhas"
      ]
    },
    {
      title: "3. Definições",
      paragraphs: ["Para fins desta Política:"],
      bullets: [
        "Dados Pessoais: qualquer informação relacionada a uma pessoa física identificada ou identificável",
        "Tratamento: qualquer operação realizada com dados pessoais",
        "Titular: pessoa física a quem os dados se referem",
        "Controlador: responsável pelas decisões referentes ao tratamento dos dados",
        "Operador: quem realiza o tratamento em nome do controlador",
        "Plataformas Parceiras: serviços integrados ao Traffic AI, como Meta Ads, Google Ads e outras ferramentas de marketing autorizadas pelo usuário"
      ]
    },
    {
      title: "4. Dados que coletamos",
      paragraphs: ["Coletamos dados nas categorias abaixo, conforme sua utilização da plataforma."]
    },
    {
      title: "4.1 Dados fornecidos diretamente pelo usuário",
      paragraphs: ["Podemos coletar:"],
      bullets: [
        "Nome completo",
        "E-mail",
        "Senha (armazenada de forma criptografada)",
        "Nome da empresa ou workspace",
        "Informações de cobrança e identificadores de assinatura",
        "Dados fiscais, quando aplicável ao plano contratado",
        "Preferências de idioma, tema e configurações da conta"
      ]
    },
    {
      title: "4.2 Dados coletados automaticamente",
      paragraphs: ["Podemos coletar:"],
      bullets: [
        "Endereço IP",
        "Navegador utilizado",
        "Sistema operacional",
        "Dispositivo utilizado",
        "Idioma e fuso horário",
        "Data e hora de acesso",
        "Logs de utilização",
        "Páginas acessadas",
        "Eventos dentro da plataforma"
      ]
    },
    {
      title: "4.3 Dados provenientes de integrações — Meta Ads",
      paragraphs: [
        "Quando você conecta sua conta Meta, acessamos apenas as informações autorizadas por você durante o OAuth. Podemos acessar:"
      ],
      bullets: [
        "Contas de anúncios",
        "Campanhas, conjuntos de anúncios e anúncios",
        "Públicos e audiências",
        "Conversões, gastos, alcance, cliques, CTR, CPC, CPA, ROAS",
        "Métricas e metadados disponibilizados pela Meta",
        "Tokens OAuth, escopos concedidos e identificadores da conta Meta"
      ]
    },
    {
      title: "4.3 Dados provenientes de integrações — Google",
      paragraphs: [
        "Quando você conecta recursos Google (como login ou Google Ads), podemos acessar dados autorizados por você, incluindo:"
      ],
      bullets: [
        "Identificadores de conta Google",
        "Campanhas, grupos de anúncios e criativos",
        "Conversões, impressões, cliques, CTR, CPC, CPA e ROAS",
        "Palavras-chave e métricas disponibilizadas pela Google",
        "Tokens OAuth e escopos concedidos"
      ]
    },
    {
      title: "4.3 Outras integrações",
      paragraphs: [
        "Futuramente poderemos integrar TikTok Ads, LinkedIn Ads, Pinterest Ads, Google Analytics, GA4, Search Console, Shopify, WooCommerce e outras plataformas autorizadas pelo usuário.",
        "Quando novas integrações forem disponibilizadas, esta Política poderá ser atualizada para refletir os dados acessados."
      ]
    },
    {
      title: "5. Como utilizamos os dados",
      paragraphs: ["Os dados coletados podem ser utilizados para:"],
      bullets: [
        "Fornecer acesso à plataforma e identificar usuários",
        "Gerenciar assinaturas e processar pagamentos",
        "Sincronizar, exibir e analisar métricas de campanhas",
        "Gerar relatórios, dashboards, alertas e recomendações",
        "Operar recursos de automação e Agency Brain",
        "Detectar fraudes e monitorar segurança",
        "Melhorar nossos serviços e experiência do produto",
        "Cumprir obrigações legais",
        "Atender solicitações de suporte"
      ]
    },
    {
      title: "6. Inteligência artificial",
      paragraphs: [
        "O Traffic AI utiliza modelos de inteligência artificial (como Google Gemini e outros provedores configurados na infraestrutura) para gerar aprendizados, sugestões, recomendações, insights, alertas e análises automáticas.",
        "Os resultados produzidos possuem caráter exclusivamente informativo. O usuário reconhece que:"
      ],
      bullets: [
        "Recomendações não constituem consultoria profissional",
        "Não há garantia de resultados financeiros ou aumento de vendas",
        "Decisões finais permanecem sob responsabilidade do usuário",
        "Não enviamos tokens de acesso Meta/Google aos modelos de IA — o contexto é montado no servidor com dados já sincronizados"
      ]
    },
    {
      title: "7. Bases legais da LGPD",
      paragraphs: ["Tratamos dados pessoais com fundamento nas seguintes bases legais:"],
      bullets: [
        "Execução de contrato — quando necessário para fornecer os serviços contratados",
        "Cumprimento de obrigação legal — quando exigido por legislação ou autoridade competente",
        "Legítimo interesse — para melhorar a plataforma, prevenir fraudes e garantir segurança",
        "Exercício regular de direitos — para defesa em processos judiciais, administrativos ou arbitrais",
        "Consentimento — quando exigido pela legislação aplicável, inclusive para integrações opcionais"
      ]
    },
    {
      title: "8. Compartilhamento de dados",
      paragraphs: ["Não vendemos dados pessoais. Podemos compartilhar informações com:"],
      bullets: [
        "Infraestrutura: Vercel, Supabase (PostgreSQL), Cloudflare e provedores de nuvem associados",
        "Inteligência artificial: Google Gemini e outros provedores de IA utilizados pela plataforma",
        "Processamento de pagamentos: Asaas (Brasil) e Stripe (internacional)",
        "Comunicação: Resend, SendGrid e serviços de e-mail transacional",
        "Autoridades — quando exigido por lei ou decisão judicial"
      ]
    },
    {
      title: "9. Transferência internacional de dados",
      paragraphs: [
        "Alguns de nossos fornecedores estão localizados fora do Brasil.",
        "Ao utilizar o Traffic AI, você reconhece que determinadas informações podem ser processadas em servidores localizados em outros países.",
        "Sempre adotaremos medidas razoáveis para garantir níveis adequados de proteção, conforme exigido pela LGPD."
      ]
    },
    {
      title: "10. Retenção dos dados",
      paragraphs: [
        "Os dados poderão ser mantidos enquanto a conta permanecer ativa, durante a vigência do contrato, pelo prazo necessário ao cumprimento de obrigações legais ou para exercício regular de direitos.",
        "Após esse período, os dados poderão ser excluídos, anonimizados ou agregados para fins estatísticos.",
        "Para solicitar exclusão, envie e-mail para " +
          LEGAL_CONTACT.privacyEmail +
          " ou siga as instruções em /data-deletion, incluindo revogação do app na Meta."
      ]
    },
    {
      title: "11. Segurança da informação",
      paragraphs: ["Adotamos medidas técnicas e organizacionais para proteger informações, incluindo:"],
      bullets: [
        "HTTPS/TLS",
        "Criptografia de senhas e dados sensíveis",
        "Controle de acesso por workspace",
        "Logs de auditoria",
        "Backups periódicos",
        "Monitoramento de segurança",
        "Proteção contra acessos não autorizados"
      ],
      tail: [
        "Apesar de nossos esforços, nenhum sistema é totalmente imune a riscos. Notificaremos incidentes relevantes conforme exigido pela LGPD."
      ]
    },
    {
      title: "12. Cookies",
      paragraphs: ["Utilizamos cookies e tecnologias similares para:"],
      bullets: [
        "Essenciais — necessários para autenticação, sessão e funcionamento da plataforma",
        "Preferências — idioma, tema e configurações de interface",
        "Analíticos — medição de desempenho e uso, quando habilitados"
      ],
      tail: [
        "O usuário pode gerenciar preferências no navegador. Desativar cookies essenciais pode impedir o uso da plataforma."
      ]
    },
    {
      title: "13. Seus direitos",
      paragraphs: [
        "Nos termos da LGPD, você pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, revogação do consentimento e informações sobre compartilhamento.",
        `Envie pedidos para ${LEGAL_CONTACT.privacyEmail}. Responderemos em prazo razoável.`,
        "Também poderá apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD)."
      ],
      bullets: [
        "Confirmação e acesso aos dados",
        "Correção de dados incorretos ou desatualizados",
        "Anonimização, bloqueio ou eliminação",
        "Portabilidade",
        "Revogação do consentimento",
        "Informações sobre compartilhamento"
      ]
    },
    {
      title: "14. Integrações com Google",
      paragraphs: [
        "Ao utilizar recursos integrados ao Google, o usuário também está sujeito às políticas da Google.",
        "Recomendamos a leitura dos seguintes documentos:",
        "Política de Privacidade do Google: https://policies.google.com/privacy",
        "Como o Google utiliza dados de parceiros: https://policies.google.com/technologies/partner-sites",
        "Gerenciamento de permissões da Conta Google: https://myaccount.google.com/permissions"
      ]
    },
    {
      title: "15. Integrações com Meta",
      paragraphs: [
        "Ao utilizar integrações com Meta Ads e demais produtos Meta, o usuário também está sujeito às políticas da Meta.",
        "Solicitamos apenas permissões necessárias para operar funcionalidades autorizadas por você. Não vendemos dados de usuários ou de campanhas.",
        "Você pode desconectar a Meta em Configurações → Integrações ou revogar o app em https://www.facebook.com/settings?tab=applications",
        "Recomendamos a leitura dos seguintes documentos:",
        "Política de Privacidade da Meta: https://www.facebook.com/privacy/policy/",
        "Termos da Plataforma Meta para Desenvolvedores: https://developers.facebook.com/terms/"
      ]
    },
    {
      title: "16. Subprocessadores",
      paragraphs: [
        "O Traffic AI poderá utilizar subprocessadores para operação dos serviços. Exemplos incluem:"
      ],
      bullets: [
        "Vercel, Supabase, Cloudflare",
        "Google (Gemini e APIs Google Ads)",
        "Meta (APIs de anúncios)",
        "Asaas e Stripe",
        "Resend e SendGrid"
      ],
      tail: ["A lista poderá ser atualizada periodicamente conforme a evolução da infraestrutura."]
    },
    {
      title: "17. Alterações nesta Política",
      paragraphs: [
        "Esta Política poderá ser modificada a qualquer momento para refletir mudanças legais, novos recursos, novas integrações ou melhorias operacionais.",
        "A versão mais recente estará sempre disponível nesta página, com a data de atualização indicada no topo.",
        "O uso continuado após alterações constitui ciência das novas condições."
      ]
    },
    {
      title: "18. Contato",
      paragraphs: [
        "Dúvidas relacionadas à privacidade, proteção de dados ou exercício de direitos poderão ser encaminhadas através dos canais oficiais do Traffic AI:",
        `Privacidade / LGPD: ${LEGAL_CONTACT.privacyEmail}`,
        `Suporte: ${LEGAL_CONTACT.supportEmail}`,
        `Comercial: ${LEGAL_CONTACT.commercialEmail}`,
        `Localização: ${LEGAL_CONTACT.companyLocation}`
      ]
    }
  ],
  footerNote: `© ${new Date().getFullYear()} Traffic AI. Todos os direitos reservados.`
};

const en: LegalPageContent = {
  badge: "Privacy",
  title: "Privacy Policy",
  subtitle: `Last updated: ${LEGAL_CONTACT.termsUpdatedDateEn}`,
  intro:
    'Traffic AI ("Traffic AI", "we", "our", or the "platform") respects user privacy and is committed to protecting personal data processed when you use our services. By using the platform, you acknowledge the practices described in this Policy, in compliance with Brazil\'s LGPD (Law No. 13,709/2018) and other applicable laws.',
  sections: [
    {
      title: "1. Introduction",
      paragraphs: [
        "This Privacy Policy explains what information we collect, how we use it, who we may share it with, and your rights regarding your data.",
        "To request data deletion or revoke integrations, see our Data Deletion Instructions at /data-deletion."
      ]
    },
    {
      title: "2. Who we are",
      paragraphs: [
        `Traffic AI is a platform specialized in analysis, monitoring, automation, and insights for digital marketing campaigns, operated from ${LEGAL_CONTACT.companyLocation}.`,
        "Our services may include:"
      ],
      bullets: [
        "Advertising campaign analysis",
        "Metrics monitoring",
        "Report generation",
        "AI-powered recommendations",
        "Ad account management",
        "Centralization of data from multiple platforms",
        "Automated alerts and learnings",
        "Campaign automation and optimization features"
      ]
    },
    {
      title: "3. Definitions",
      paragraphs: ["For the purposes of this Policy:"],
      bullets: [
        "Personal Data: any information relating to an identified or identifiable natural person",
        "Processing: any operation performed on personal data",
        "Data Subject: the natural person to whom the data refers",
        "Controller: entity responsible for processing decisions",
        "Processor: entity that processes data on behalf of the controller",
        "Partner Platforms: services integrated with Traffic AI, such as Meta Ads, Google Ads, and other marketing tools authorized by you"
      ]
    },
    {
      title: "4. Data we collect",
      paragraphs: ["We collect data in the categories below, depending on how you use the platform."]
    },
    {
      title: "4.1 Data you provide directly",
      paragraphs: ["We may collect:"],
      bullets: [
        "Full name",
        "Email address",
        "Password (stored encrypted)",
        "Company or workspace name",
        "Billing information and subscription identifiers",
        "Tax information, when applicable to your plan",
        "Language, theme, and account preferences"
      ]
    },
    {
      title: "4.2 Automatically collected data",
      paragraphs: ["We may collect:"],
      bullets: [
        "IP address",
        "Browser used",
        "Operating system",
        "Device used",
        "Language and time zone",
        "Access date and time",
        "Usage logs",
        "Pages visited",
        "In-platform events"
      ]
    },
    {
      title: "4.3 Integration data — Meta Ads",
      paragraphs: [
        "When you connect your Meta account, we access only information you authorize during OAuth. We may access:"
      ],
      bullets: [
        "Ad accounts",
        "Campaigns, ad sets, and ads",
        "Audiences",
        "Conversions, spend, reach, clicks, CTR, CPC, CPA, ROAS",
        "Metrics and metadata provided by Meta",
        "OAuth tokens, granted scopes, and Meta account identifiers"
      ]
    },
    {
      title: "4.3 Integration data — Google",
      paragraphs: [
        "When you connect Google features (such as login or Google Ads), we may access data you authorize, including:"
      ],
      bullets: [
        "Google account identifiers",
        "Campaigns, ad groups, and creatives",
        "Conversions, impressions, clicks, CTR, CPC, CPA, and ROAS",
        "Keywords and metrics provided by Google",
        "OAuth tokens and granted scopes"
      ]
    },
    {
      title: "4.3 Other integrations",
      paragraphs: [
        "We may integrate TikTok Ads, LinkedIn Ads, Pinterest Ads, Google Analytics, GA4, Search Console, Shopify, WooCommerce, and other user-authorized platforms in the future.",
        "When new integrations become available, this Policy may be updated to reflect the data accessed."
      ]
    },
    {
      title: "5. How we use data",
      paragraphs: ["Collected data may be used to:"],
      bullets: [
        "Provide platform access and identify users",
        "Manage subscriptions and process payments",
        "Sync, display, and analyze campaign metrics",
        "Generate reports, dashboards, alerts, and recommendations",
        "Operate automation features and Agency Brain",
        "Detect fraud and monitor security",
        "Improve our services and product experience",
        "Comply with legal obligations",
        "Handle support requests"
      ]
    },
    {
      title: "6. Artificial intelligence",
      paragraphs: [
        "Traffic AI uses AI models (such as Google Gemini and other providers configured in our infrastructure) to generate learnings, suggestions, recommendations, insights, alerts, and automated analyses.",
        "Results are for informational purposes only. You acknowledge that:"
      ],
      bullets: [
        "Recommendations do not constitute professional consulting",
        "There is no guarantee of financial results or sales growth",
        "Final decisions remain your responsibility",
        "We do not send Meta/Google access tokens to AI models — context is built on the server from synced data"
      ]
    },
    {
      title: "7. LGPD legal bases",
      paragraphs: ["We process personal data based on the following legal grounds:"],
      bullets: [
        "Contract performance — when necessary to provide contracted services",
        "Legal obligation — when required by law or competent authority",
        "Legitimate interest — to improve the platform, prevent fraud, and ensure security",
        "Regular exercise of rights — for defense in judicial, administrative, or arbitration proceedings",
        "Consent — when required by applicable law, including optional integrations"
      ]
    },
    {
      title: "8. Data sharing",
      paragraphs: ["We do not sell personal data. We may share information with:"],
      bullets: [
        "Infrastructure: Vercel, Supabase (PostgreSQL), Cloudflare, and associated cloud providers",
        "Artificial intelligence: Google Gemini and other AI providers used by the platform",
        "Payment processing: Asaas (Brazil) and Stripe (international)",
        "Communication: Resend, SendGrid, and transactional email services",
        "Authorities — when required by law or court order"
      ]
    },
    {
      title: "9. International data transfers",
      paragraphs: [
        "Some of our providers are located outside Brazil.",
        "By using Traffic AI, you acknowledge that certain information may be processed on servers in other countries.",
        "We will adopt reasonable measures to ensure adequate protection levels as required by LGPD."
      ]
    },
    {
      title: "10. Data retention",
      paragraphs: [
        "Data may be retained while your account is active, during the contract term, as required to comply with legal obligations, or for the regular exercise of rights.",
        "After that period, data may be deleted, anonymized, or aggregated for statistical purposes.",
        "To request deletion, email " +
          LEGAL_CONTACT.privacyEmail +
          " or follow the instructions at /data-deletion, including revoking the app on Meta."
      ]
    },
    {
      title: "11. Information security",
      paragraphs: ["We adopt technical and organizational measures to protect information, including:"],
      bullets: [
        "HTTPS/TLS",
        "Encryption of passwords and sensitive data",
        "Workspace access controls",
        "Audit logs",
        "Periodic backups",
        "Security monitoring",
        "Protection against unauthorized access"
      ],
      tail: [
        "Despite our efforts, no system is completely risk-free. We will notify relevant incidents as required by LGPD."
      ]
    },
    {
      title: "12. Cookies",
      paragraphs: ["We use cookies and similar technologies for:"],
      bullets: [
        "Essential — required for authentication, session, and platform operation",
        "Preferences — language, theme, and interface settings",
        "Analytics — performance and usage measurement, when enabled"
      ],
      tail: ["You can manage preferences in your browser. Disabling essential cookies may prevent platform use."]
    },
    {
      title: "13. Your rights",
      paragraphs: [
        "Under LGPD, you may request confirmation of processing, access, correction, anonymization, blocking, deletion, portability, consent withdrawal, and information about sharing.",
        `Send requests to ${LEGAL_CONTACT.privacyEmail}. We will respond within a reasonable time.`,
        "You may also file a complaint with Brazil's National Data Protection Authority (ANPD)."
      ],
      bullets: [
        "Confirmation and access to data",
        "Correction of inaccurate or outdated data",
        "Anonymization, blocking, or deletion",
        "Portability",
        "Consent withdrawal",
        "Information about sharing"
      ]
    },
    {
      title: "14. Google integrations",
      paragraphs: [
        "When using Google-integrated features, you are also subject to Google's policies.",
        "We recommend reading the following documents:",
        "Google Privacy Policy: https://policies.google.com/privacy",
        "How Google uses partner data: https://policies.google.com/technologies/partner-sites",
        "Google Account permissions: https://myaccount.google.com/permissions"
      ]
    },
    {
      title: "15. Meta integrations",
      paragraphs: [
        "When using Meta Ads and other Meta product integrations, you are also subject to Meta's policies.",
        "We request only permissions needed to operate features you authorize. We do not sell user or campaign data.",
        "You can disconnect Meta in Settings → Integrations or revoke the app at https://www.facebook.com/settings?tab=applications",
        "We recommend reading the following documents:",
        "Meta Privacy Policy: https://www.facebook.com/privacy/policy/",
        "Meta Platform Terms for Developers: https://developers.facebook.com/terms/"
      ]
    },
    {
      title: "16. Subprocessors",
      paragraphs: ["Traffic AI may use subprocessors to operate the services. Examples include:"],
      bullets: [
        "Vercel, Supabase, Cloudflare",
        "Google (Gemini and Google Ads APIs)",
        "Meta (ads APIs)",
        "Asaas and Stripe",
        "Resend and SendGrid"
      ],
      tail: ["This list may be updated periodically as infrastructure evolves."]
    },
    {
      title: "17. Changes to this Policy",
      paragraphs: [
        "This Policy may be modified at any time to reflect legal changes, new features, new integrations, or operational improvements.",
        "The latest version will always be available on this page, with the update date shown at the top.",
        "Continued use after changes constitutes acknowledgment of the new conditions."
      ]
    },
    {
      title: "18. Contact",
      paragraphs: [
        "Questions about privacy, data protection, or exercising your rights may be sent through Traffic AI's official channels:",
        `Privacy / LGPD: ${LEGAL_CONTACT.privacyEmail}`,
        `Support: ${LEGAL_CONTACT.supportEmail}`,
        `Commercial: ${LEGAL_CONTACT.commercialEmail}`,
        `Location: ${LEGAL_CONTACT.companyLocation}`
      ]
    }
  ],
  footerNote: `© ${new Date().getFullYear()} Traffic AI. All rights reserved.`
};

export const privacyContent: Record<LegalLocale, LegalPageContent> = { "pt-BR": pt, en };

export function getPrivacyContent(locale: string): LegalPageContent {
  return privacyContent[locale === "en" ? "en" : "pt-BR"];
}
