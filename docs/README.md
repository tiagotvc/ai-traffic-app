# Documentação do sistema

Esta pasta documenta o sistema **feature por feature**. Cada feature tem sua própria
pasta com um `README.md` que é a **fonte de verdade** daquela feature.

## Como usar esta documentação

- **Antes de mexer em uma feature**, leia o `README.md` dela para entender estrutura,
  componentes, props e decisões de design.
- **A cada incremento ou decremento** na feature (mudou layout, adicionou/removeu um
  elemento, mudou comportamento), **atualize o `README.md` correspondente** na mesma PR.
  O doc nunca deve ficar atrás do código.
- Quando criar uma feature nova, crie uma pasta nova aqui com o mesmo padrão.

## Features

Organizadas pelas **abas do sidebar** do app.

| Aba (sidebar) | Pasta | Descrição |
|---|---|---|
| Destaques | [`dashboard-destaques/`](./dashboard-destaques/README.md) | Tela inicial: card de alerta, KPIs, gráfico de performance e faixa etária. |
| Visões | [`visoes/`](./visoes/README.md) | Implementação da aba `/dashboard/views`: galeria de dashboards e editor de canvas (widgets). |
| Clientes | [`clientes/`](./clientes/README.md) | Lista, criação (wizard) e visão geral/configurações de clientes. |
| Campanhas | [`campanhas/`](./campanhas/README.md) | Hub, hierarquia campanha → conjunto → anúncio e wizard de criação/publicação. |
| Públicos | [`publicos/`](./publicos/README.md) | Públicos personalizados, lookalike e salvos (sincronizados da Meta). |
| Classificação de criativos | [`criativos/`](./criativos/README.md) | Ranking de criativos por performance. |
| Relatórios | [`relatorios/`](./relatorios/README.md) | Relatórios simples/completos, agendamentos e exportação em PDF. |
| Cérebro da agência (Beta) | [`cerebro-da-agencia/`](./cerebro-da-agencia/README.md) | Grupo: Aprendizados, Hipóteses, Automações + módulos estendidos. |
| Automações | [`automacoes/`](./automacoes/README.md) | Regras se-então que monitoram e otimizam campanhas (motor no sync). |

### Documentação transversal

| Tema | Pasta | Descrição |
|---|---|---|
| Módulo Visão (catálogo de componentes) | [`visao/`](./visao/README.md) | Catálogo conceitual de componentes 100% editáveis para o módulo de dashboards customizados. Complementa a aba [Visões](./visoes/README.md). |
| Navegação — Sidebar e Menu do Usuário | [`navegacao-sidebar/`](./navegacao-sidebar/README.md) | Abas do sidebar e comportamento do menu do usuário (abre ao lado, fecha ao clicar fora). |
| Configurações / Perfil | [`configuracoes/`](./configuracoes/README.md) | Tela `/settings` com abas no topo: Geral, Plano & Limites, Integrações, Equipe, Dados. |
| Institucional & Legal + Conformidade Meta | [`institucional-legal/`](./institucional-legal/README.md) | Central de Ajuda, Sobre, Termos, Privacidade, Exclusão de Dados; marca Orion Agency; e-mail único + envio do formulário; logo; modal de termos no login; requisitos da Meta. |
| UI — Padrão de Modais | [`ui-modais/`](./ui-modais/README.md) | Padrão único de modais (Esc + clique-fora + superfície) e exceções (gates/drawers). |
| Pagamentos & Billing | [`pagamentos/`](./pagamentos/README.md) | Auditoria de Stripe/Asaas, webhooks, ciclo de vida da assinatura, segurança e gaps. |
| Landing, Planos, Addons e Login | [`landing-e-planos/`](./landing-e-planos/README.md) | URL da landing, análise vs. Reportei, recomendação de planos/preços, addons e painel de login. |

## Convenções

- Caminhos de arquivo são relativos à raiz do repositório.
- "Dash" = a tela de Destaques (fixa, pouco customizável na v1).
- "Visão" = o módulo futuro onde **cada elemento vira um componente editável**.
- Componentes do dashboard ficam em `src/components/dashboard/`.
