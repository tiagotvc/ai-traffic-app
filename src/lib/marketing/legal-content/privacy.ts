import { LEGAL_CONTACT } from "@/lib/marketing/legal-contact";
import type { LegalLocale, LegalPageContent } from "@/lib/marketing/legal-content/types";

const pt: LegalPageContent = {
  badge: "Privacidade",
  title: "Política de Privacidade",
  subtitle: `Última atualização: ${LEGAL_CONTACT.termsUpdatedDate}`,
  intro:
    'O Orion Agency ("Orion Agency", "nós", "nosso" ou "plataforma") respeita a privacidade de seus usuários e está comprometido com a proteção dos dados pessoais tratados durante a utilização de nossos serviços. Ao utilizar a plataforma, você declara estar ciente das práticas descritas nesta Política, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 – LGPD) e demais legislações aplicáveis.',
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
        `O Orion Agency é uma plataforma de gestão e análise de campanhas de marketing digital na Meta (Facebook e Instagram), operada a partir de ${LEGAL_CONTACT.companyLocation}.`,
        "Nossos serviços incluem:"
      ],
      bullets: [
        "Criação e gestão de campanhas, conjuntos de anúncios e anúncios na Meta",
        "Análise e monitoramento de métricas de campanhas",
        "Criação de públicos e personas",
        "Geração de relatórios e dashboards",
        "Recomendações, aprendizados e insights por inteligência artificial",
        "Recursos de automação e otimização (Agency Brain e cientistas de pesquisa)",
        "Envio server-side de eventos de conversão para a Meta (Conversions API)"
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
        "Plataformas Parceiras: serviços integrados ao Orion Agency e autorizados por você, como a Meta"
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
        "Senha (armazenada de forma criptografada) — ou, no login social, nome e e-mail do perfil fornecidos pela Meta ou Google",
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
        "Navegador, sistema operacional e dispositivo",
        "Idioma e fuso horário",
        "Data e hora de acesso e logs de utilização",
        "Páginas acessadas e eventos dentro da plataforma"
      ]
    },
    {
      title: "4.3 Dados provenientes da integração com a Meta",
      paragraphs: [
        "Quando você conecta sua conta Meta, acessamos apenas as informações autorizadas por você durante o login/OAuth, por meio das APIs oficiais da Meta. Podemos acessar:"
      ],
      bullets: [
        "Contas de anúncios e Business Manager",
        "Campanhas, conjuntos de anúncios e anúncios",
        "Públicos e audiências",
        "Páginas do Facebook e contas do Instagram associadas",
        "Ativos do WhatsApp Business, quando você os conecta",
        "Pixels e eventos de conversão",
        "Métricas (gastos, alcance, impressões, cliques, CTR, CPC, CPA, ROAS) e metadados disponibilizados pela Meta",
        "Tokens de acesso (OAuth), escopos concedidos e identificadores da conta Meta"
      ]
    },
    {
      title: "4.4 Dados de conversão (Conversions API)",
      paragraphs: [
        "Se você habilitar a Conversions API (CAPI), processamos eventos de conversão para envio server-side à Meta. Quando esses eventos incluem identificadores do cliente (como e-mail ou telefone), eles são convertidos em hash criptográfico (SHA-256) antes do envio, conforme exigido pela Meta — utilizados apenas para correspondência de eventos.",
        "Não armazenamos esses identificadores em texto claro, e a deduplicação é feita por identificador de evento (event_id)."
      ]
    },
    {
      title: "5. Como utilizamos os dados",
      paragraphs: ["Os dados coletados podem ser utilizados para:"],
      bullets: [
        "Fornecer acesso à plataforma e identificar usuários",
        "Gerenciar assinaturas e processar pagamentos",
        "Criar, sincronizar, exibir e analisar campanhas e métricas",
        "Gerar relatórios, dashboards, alertas e recomendações",
        "Operar recursos de automação, Agency Brain e cientistas de pesquisa",
        "Enviar eventos de conversão à Meta quando habilitado por você",
        "Detectar fraudes e monitorar segurança",
        "Melhorar nossos serviços e atender solicitações de suporte",
        "Cumprir obrigações legais"
      ]
    },
    {
      title: "6. Inteligência artificial",
      paragraphs: [
        "O Orion Agency utiliza modelos de inteligência artificial — Google Gemini e Anthropic Claude — para gerar aprendizados, sugestões, recomendações, insights, textos e análises automáticas.",
        "Os resultados possuem caráter exclusivamente informativo. O usuário reconhece que:"
      ],
      bullets: [
        "Recomendações não constituem consultoria profissional",
        "Não há garantia de resultados financeiros ou aumento de vendas",
        "Decisões finais permanecem sob responsabilidade do usuário",
        "Não enviamos tokens de acesso da Meta aos modelos de IA — o contexto é montado no servidor com dados já sincronizados"
      ]
    },
    {
      title: "7. Pesquisa de mercado",
      paragraphs: [
        "Para análise de concorrentes e tendências, podemos consultar fontes públicas (como a Biblioteca de Anúncios da Meta e resultados de busca) usando apenas termos de nicho — sem dados pessoais.",
        "Esses dados são públicos e usados apenas para gerar insights de mercado."
      ]
    },
    {
      title: "8. Entrega por WhatsApp",
      paragraphs: [
        "Caso você habilite o envio de relatórios por WhatsApp, utilizamos a WhatsApp Business Cloud API (Meta) para enviar mensagens aos destinatários que você configurar.",
        "Você é responsável por possuir base legal e o consentimento dos destinatários para esse envio."
      ]
    },
    {
      title: "9. Bases legais da LGPD",
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
      title: "10. Compartilhamento de dados",
      paragraphs: ["Não vendemos dados pessoais. Podemos compartilhar informações com:"],
      bullets: [
        "Infraestrutura: Vercel, Supabase (PostgreSQL) e Cloudflare",
        "Inteligência artificial: Google (Gemini) e Anthropic (Claude)",
        "Plataforma de anúncios: Meta (APIs de anúncios, Conversions API e WhatsApp Business)",
        "Processamento de pagamentos: Asaas (Brasil) e Stripe (internacional)",
        "Comunicação: provedores de e-mail transacional",
        "Autoridades — quando exigido por lei ou decisão judicial"
      ]
    },
    {
      title: "11. Transferência internacional de dados",
      paragraphs: [
        "Alguns de nossos fornecedores estão localizados fora do Brasil.",
        "Ao utilizar o Orion Agency, você reconhece que determinadas informações podem ser processadas em servidores localizados em outros países.",
        "Sempre adotaremos medidas razoáveis para garantir níveis adequados de proteção, conforme exigido pela LGPD."
      ]
    },
    {
      title: "12. Retenção e exclusão dos dados",
      paragraphs: [
        "Os dados poderão ser mantidos enquanto a conta permanecer ativa, durante a vigência do contrato, pelo prazo necessário ao cumprimento de obrigações legais ou para exercício regular de direitos.",
        "Após esse período, os dados poderão ser excluídos, anonimizados ou agregados para fins estatísticos.",
        `Para solicitar exclusão, envie e-mail para ${LEGAL_CONTACT.supportEmail} ou siga as instruções em /data-deletion. Você também pode revogar o acesso do app diretamente na Meta.`
      ]
    },
    {
      title: "13. Segurança da informação",
      paragraphs: ["Adotamos medidas técnicas e organizacionais para proteger informações, incluindo:"],
      bullets: [
        "HTTPS/TLS",
        "Criptografia de senhas e dados sensíveis",
        "Hash (SHA-256) de identificadores enviados à Conversions API",
        "Controle de acesso por workspace",
        "Logs de auditoria e backups periódicos",
        "Monitoramento e proteção contra acessos não autorizados"
      ],
      tail: [
        "Apesar de nossos esforços, nenhum sistema é totalmente imune a riscos. Notificaremos incidentes relevantes conforme exigido pela LGPD."
      ]
    },
    {
      title: "14. Cookies",
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
      title: "15. Seus direitos",
      paragraphs: [
        "Nos termos da LGPD, você pode solicitar confirmação do tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, revogação do consentimento e informações sobre compartilhamento.",
        `Envie pedidos para ${LEGAL_CONTACT.supportEmail}. Responderemos em prazo razoável.`,
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
      title: "16. Integrações com a Meta",
      paragraphs: [
        "Ao utilizar as integrações com a Meta (Facebook, Instagram, Anúncios, Conversions API e WhatsApp Business), você também está sujeito às políticas da Meta.",
        "Solicitamos apenas as permissões necessárias para operar as funcionalidades autorizadas por você. Não vendemos dados de usuários ou de campanhas, nem usamos os dados da Meta para finalidades não descritas nesta Política.",
        "Você pode desconectar a Meta a qualquer momento em Configurações → Integrações, ou revogar o app em https://www.facebook.com/settings?tab=applications. A revogação interrompe novos acessos e você pode solicitar a exclusão dos dados já sincronizados.",
        "Recomendamos a leitura da Política de Privacidade da Meta (https://www.facebook.com/privacy/policy/) e dos Termos da Plataforma para Desenvolvedores (https://developers.facebook.com/terms/)."
      ]
    },
    {
      title: "17. Subprocessadores",
      paragraphs: [
        "O Orion Agency utiliza subprocessadores para operação dos serviços. Atualmente incluem:"
      ],
      bullets: [
        "Vercel, Supabase e Cloudflare (infraestrutura e hospedagem)",
        "Google (Gemini) e Anthropic (Claude) — inteligência artificial",
        "Meta (APIs de anúncios, Conversions API e WhatsApp Business)",
        "Asaas e Stripe (pagamentos)",
        "Provedores de e-mail transacional"
      ],
      tail: ["A lista poderá ser atualizada periodicamente conforme a evolução da infraestrutura."]
    },
    {
      title: "18. Alterações nesta Política",
      paragraphs: [
        "Esta Política poderá ser modificada a qualquer momento para refletir mudanças legais, novos recursos ou melhorias operacionais.",
        "A versão mais recente estará sempre disponível nesta página, com a data de atualização indicada no topo.",
        "O uso continuado após alterações constitui ciência das novas condições."
      ]
    },
    {
      title: "19. Contato",
      paragraphs: [
        "Dúvidas relacionadas à privacidade, proteção de dados ou exercício de direitos poderão ser encaminhadas pelo canal oficial do Orion Agency:",
        `Contato: ${LEGAL_CONTACT.supportEmail}`,
        `Localização: ${LEGAL_CONTACT.companyLocation}`
      ]
    }
  ],
  footerNote: `© ${new Date().getFullYear()} Orion Agency. Todos os direitos reservados.`
};

const en: LegalPageContent = {
  badge: "Privacy",
  title: "Privacy Policy",
  subtitle: `Last updated: ${LEGAL_CONTACT.termsUpdatedDateEn}`,
  intro:
    'Orion Agency ("Orion Agency", "we", "our", or the "platform") respects user privacy and is committed to protecting personal data processed when you use our services. By using the platform, you acknowledge the practices described in this Policy, in compliance with Brazil\'s LGPD (Law No. 13,709/2018) and other applicable laws.',
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
        `Orion Agency is a platform for managing and analyzing digital marketing campaigns on Meta (Facebook and Instagram), operated from ${LEGAL_CONTACT.companyLocation}.`,
        "Our services include:"
      ],
      bullets: [
        "Creating and managing campaigns, ad sets, and ads on Meta",
        "Analyzing and monitoring campaign metrics",
        "Building audiences and personas",
        "Generating reports and dashboards",
        "AI-powered learnings, suggestions, and insights",
        "Automation and optimization features (Agency Brain and research scientists)",
        "Server-side conversion events to Meta (Conversions API)"
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
        "Partner Platforms: services integrated with Orion Agency and authorized by you, such as Meta"
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
        "Password (stored encrypted) — or, with social login, the profile name and email provided by Meta or Google",
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
        "Browser, operating system, and device",
        "Language and time zone",
        "Access date and time and usage logs",
        "Pages visited and in-platform events"
      ]
    },
    {
      title: "4.3 Data from the Meta integration",
      paragraphs: [
        "When you connect your Meta account, we access only the information you authorize during login/OAuth, through Meta's official APIs. We may access:"
      ],
      bullets: [
        "Ad accounts and Business Manager",
        "Campaigns, ad sets, and ads",
        "Audiences",
        "Associated Facebook Pages and Instagram accounts",
        "WhatsApp Business assets, when you connect them",
        "Pixels and conversion events",
        "Metrics (spend, reach, impressions, clicks, CTR, CPC, CPA, ROAS) and metadata provided by Meta",
        "Access tokens (OAuth), granted scopes, and Meta account identifiers"
      ]
    },
    {
      title: "4.4 Conversion data (Conversions API)",
      paragraphs: [
        "If you enable the Conversions API (CAPI), we process conversion events for server-side delivery to Meta. When these events include customer identifiers (such as email or phone), they are cryptographically hashed (SHA-256) before sending, as required by Meta — used only for event matching.",
        "We do not store these identifiers in plain text, and deduplication is performed via an event identifier (event_id)."
      ]
    },
    {
      title: "5. How we use data",
      paragraphs: ["Collected data may be used to:"],
      bullets: [
        "Provide platform access and identify users",
        "Manage subscriptions and process payments",
        "Create, sync, display, and analyze campaigns and metrics",
        "Generate reports, dashboards, alerts, and recommendations",
        "Operate automation, Agency Brain, and research scientists",
        "Send conversion events to Meta when you enable it",
        "Detect fraud and monitor security",
        "Improve our services and handle support requests",
        "Comply with legal obligations"
      ]
    },
    {
      title: "6. Artificial intelligence",
      paragraphs: [
        "Orion Agency uses AI models — Google Gemini and Anthropic Claude — to generate learnings, suggestions, recommendations, insights, copy, and automated analyses.",
        "Results are for informational purposes only. You acknowledge that:"
      ],
      bullets: [
        "Recommendations do not constitute professional consulting",
        "There is no guarantee of financial results or sales growth",
        "Final decisions remain your responsibility",
        "We do not send Meta access tokens to AI models — context is built on the server from synced data"
      ]
    },
    {
      title: "7. Market research",
      paragraphs: [
        "For competitor and trend analysis, we may query public sources (such as the Meta Ad Library and search results) using only niche-related search terms — no personal data.",
        "This data is public and used only to generate market insights."
      ]
    },
    {
      title: "8. WhatsApp delivery",
      paragraphs: [
        "If you enable report delivery via WhatsApp, we use the WhatsApp Business Cloud API (Meta) to send messages to recipients you configure.",
        "You are responsible for having a legal basis and the recipients' consent for such delivery."
      ]
    },
    {
      title: "9. LGPD legal bases",
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
      title: "10. Data sharing",
      paragraphs: ["We do not sell personal data. We may share information with:"],
      bullets: [
        "Infrastructure: Vercel, Supabase (PostgreSQL), and Cloudflare",
        "Artificial intelligence: Google (Gemini) and Anthropic (Claude)",
        "Advertising platform: Meta (ads APIs, Conversions API, and WhatsApp Business)",
        "Payment processing: Asaas (Brazil) and Stripe (international)",
        "Communication: transactional email providers",
        "Authorities — when required by law or court order"
      ]
    },
    {
      title: "11. International data transfers",
      paragraphs: [
        "Some of our providers are located outside Brazil.",
        "By using Orion Agency, you acknowledge that certain information may be processed on servers in other countries.",
        "We will adopt reasonable measures to ensure adequate protection levels as required by LGPD."
      ]
    },
    {
      title: "12. Data retention and deletion",
      paragraphs: [
        "Data may be retained while your account is active, during the contract term, as required to comply with legal obligations, or for the regular exercise of rights.",
        "After that period, data may be deleted, anonymized, or aggregated for statistical purposes.",
        `To request deletion, email ${LEGAL_CONTACT.supportEmail} or follow the instructions at /data-deletion. You can also revoke the app's access directly on Meta.`
      ]
    },
    {
      title: "13. Information security",
      paragraphs: ["We adopt technical and organizational measures to protect information, including:"],
      bullets: [
        "HTTPS/TLS",
        "Encryption of passwords and sensitive data",
        "Hashing (SHA-256) of identifiers sent to the Conversions API",
        "Workspace access controls",
        "Audit logs and periodic backups",
        "Monitoring and protection against unauthorized access"
      ],
      tail: [
        "Despite our efforts, no system is completely risk-free. We will notify relevant incidents as required by LGPD."
      ]
    },
    {
      title: "14. Cookies",
      paragraphs: ["We use cookies and similar technologies for:"],
      bullets: [
        "Essential — required for authentication, session, and platform operation",
        "Preferences — language, theme, and interface settings",
        "Analytics — performance and usage measurement, when enabled"
      ],
      tail: ["You can manage preferences in your browser. Disabling essential cookies may prevent platform use."]
    },
    {
      title: "15. Your rights",
      paragraphs: [
        "Under LGPD, you may request confirmation of processing, access, correction, anonymization, blocking, deletion, portability, consent withdrawal, and information about sharing.",
        `Send requests to ${LEGAL_CONTACT.supportEmail}. We will respond within a reasonable time.`,
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
      title: "16. Meta integrations",
      paragraphs: [
        "When using Meta integrations (Facebook, Instagram, Ads, Conversions API, and WhatsApp Business), you are also subject to Meta's policies.",
        "We request only the permissions needed to operate the features you authorize. We do not sell user or campaign data, nor use Meta data for purposes not described in this Policy.",
        "You can disconnect Meta at any time in Settings → Integrations, or revoke the app at https://www.facebook.com/settings?tab=applications. Revoking stops new access, and you may request deletion of already-synced data.",
        "We recommend reading Meta's Privacy Policy (https://www.facebook.com/privacy/policy/) and the Platform Terms for Developers (https://developers.facebook.com/terms/)."
      ]
    },
    {
      title: "17. Subprocessors",
      paragraphs: ["Orion Agency uses subprocessors to operate the services. They currently include:"],
      bullets: [
        "Vercel, Supabase, and Cloudflare (infrastructure and hosting)",
        "Google (Gemini) and Anthropic (Claude) — artificial intelligence",
        "Meta (ads APIs, Conversions API, and WhatsApp Business)",
        "Asaas and Stripe (payments)",
        "Transactional email providers"
      ],
      tail: ["This list may be updated periodically as infrastructure evolves."]
    },
    {
      title: "18. Changes to this Policy",
      paragraphs: [
        "This Policy may be modified at any time to reflect legal changes, new features, or operational improvements.",
        "The latest version will always be available on this page, with the update date shown at the top.",
        "Continued use after changes constitutes acknowledgment of the new conditions."
      ]
    },
    {
      title: "19. Contact",
      paragraphs: [
        "Questions about privacy, data protection, or exercising your rights may be sent through Orion Agency's official channel:",
        `Contact: ${LEGAL_CONTACT.supportEmail}`,
        `Location: ${LEGAL_CONTACT.companyLocation}`
      ]
    }
  ],
  footerNote: `© ${new Date().getFullYear()} Orion Agency. All rights reserved.`
};

export const privacyContent: Record<LegalLocale, LegalPageContent> = { "pt-BR": pt, en };

export function getPrivacyContent(locale: string): LegalPageContent {
  return privacyContent[locale === "en" ? "en" : "pt-BR"];
}
