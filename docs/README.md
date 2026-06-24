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

### Documentação transversal

| Tema | Pasta | Descrição |
|---|---|---|
| Módulo Visão (catálogo de componentes) | [`visao/`](./visao/README.md) | Catálogo conceitual de componentes 100% editáveis para o módulo de dashboards customizados. Complementa a aba [Visões](./visoes/README.md). |

## Convenções

- Caminhos de arquivo são relativos à raiz do repositório.
- "Dash" = a tela de Destaques (fixa, pouco customizável na v1).
- "Visão" = o módulo futuro onde **cada elemento vira um componente editável**.
- Componentes do dashboard ficam em `src/components/dashboard/`.
