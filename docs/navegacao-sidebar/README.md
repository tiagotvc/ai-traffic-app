# Navegação — Sidebar e Menu do Usuário

> Componentes: sidebar do app e o menu que abre ao clicar no nome do usuário (rodapé do sidebar).
> Fonte de verdade desta feature. Atualize este doc a cada incremento/decremento.

## Arquitetura / fluxo de arquivos

| Camada | Arquivo |
|---|---|
| Sidebar principal (itens de nav) | [`src/components/layout/AppSidebar.tsx`](../../src/components/layout/AppSidebar.tsx) |
| Grupo Cérebro da agência (nav) | [`src/components/layout/AgencyBrainNavGroup.tsx`](../../src/components/layout/AgencyBrainNavGroup.tsx) |
| Rodapé do sidebar (bloco do usuário) | [`src/components/layout/SidebarFooter.tsx`](../../src/components/layout/SidebarFooter.tsx) |
| **Menu do usuário + chrome do sidebar** | [`src/components/layout/SidebarUxChrome.tsx`](../../src/components/layout/SidebarUxChrome.tsx) (`SidebarUserBlock`) |
| Hook de fechar ao clicar fora | [`src/hooks/useDismissOnOutsideClick.ts`](../../src/hooks/useDismissOnOutsideClick.ts) |

## Abas do sidebar

`Destaques` · `Visões` · `Clientes` · `Campanhas` (gated) · `Públicos` (gated) ·
`Classificação de criativos` (gated) · `Cérebro da agência` (Beta, grupo) · `Relatórios` (gated).
Cada uma tem doc próprio em [`docs/`](../README.md).

## Menu do usuário (`SidebarUserBlock`)

Abre ao clicar no bloco do usuário no rodapé do sidebar. Conteúdo: Meu perfil, Faturamento,
links institucionais (Suporte/Sobre/Termos/Privacidade/Exclusão de Dados), idioma, tema,
seção admin (se `isPlatformAdmin`: Usuários, Planos, Finanças, Cupons, Reembolsos, **Contatos**)
e Sair. Os itens admin vêm de [`admin-nav-links.ts`](../../src/components/layout/admin-nav-links.ts).

### Comportamento de abertura

| Contexto | Posição do menu |
|---|---|
| Desktop (sidebar expandido **ou** minimizado) | **Extensão do sidebar**: encostado na borda direita (`absolute bottom-0 left-full w-60`), **mesmo fundo do sidebar** (`#0a0f14`), cantos arredondados só do lado externo (`rounded-r-xl border-l-0`). Parece um flyout do próprio sidebar. Cores/ícones inalterados. |
| Mobile (`mobileFullScreen`) | Tela cheia (`fixed inset-0`) com botão de voltar próprio. |

### Correções (2026-06-24)

- **Antes:** no sidebar **expandido**, o menu abria por cima do próprio sidebar
  (`bottom-full left-3 right-3`), sobrepondo os itens de navegação. **Agora** abre **ao lado**,
  igual ao comportamento do sidebar minimizado (posição unificada `left-full`).
- **Antes:** o menu **não fechava ao clicar fora**. **Agora** usa
  [`useDismissOnOutsideClick`](../../src/hooks/useDismissOnOutsideClick.ts) (escuta `mousedown` e
  fecha quando o clique é fora do `rootRef`), ativo quando `menuOpen && !mobileFullScreen`
  (no modo mobile full-screen há botão de voltar dedicado, então o clique-fora não se aplica).

Detalhes de implementação em `SidebarUserBlock`:
- `rootRef` envolve o bloco inteiro (botão + menu), para o clique-fora considerar o menu como "dentro".
- O botão toggle continua alternando via `onClick`; o `mousedown` dentro do `rootRef` não dispara o fechamento.

## Pendências / observações

- O `SidebarLanguageSelector` (no mesmo arquivo) já usava `useDismissOnOutsideClick`; o
  `SidebarUserBlock` agora segue o mesmo padrão.

## Histórico de mudanças relevantes

- **2026-06-24 (parte 2):** Menu do usuário estilizado como **extensão do sidebar** (mesmo fundo,
  encostado, arredondado só no lado externo).
- **2026-06-24:** Menu do usuário passa a abrir ao lado (igual ao minimizado) e a fechar ao
  clicar fora.
