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

| Feature | Pasta | Descrição |
|---|---|---|
| Dashboard — Destaques | [`dashboard-destaques/`](./dashboard-destaques/README.md) | Tela inicial com card de alerta, KPIs, gráfico de performance e faixa etária. |
| Visão (módulo de dashboards editáveis) | [`visao/`](./visao/README.md) | Catálogo de componentes 100% editáveis para montar dashboards customizados. Documentação de produto/arquitetura (em construção). |

## Convenções

- Caminhos de arquivo são relativos à raiz do repositório.
- "Dash" = a tela de Destaques (fixa, pouco customizável na v1).
- "Visão" = o módulo futuro onde **cada elemento vira um componente editável**.
- Componentes do dashboard ficam em `src/components/dashboard/`.
