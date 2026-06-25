# UI — Padrão de Modais

> Fonte de verdade para consistência de modais. Atualize ao criar/alterar modais.

## Padrão oficial

Modais dispensáveis devem seguir este padrão (evita "frankensteins"):

```tsx
// Overlay (fecha ao clicar fora)
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
  {/* Container */}
  <div
    className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] shadow-xl"
    onMouseDown={(e) => e.stopPropagation()}
  >
    {/* header / body / footer com border-[var(--border-color)] e padding px-5 */}
  </div>
</div>
```

E o listener de **Esc**:

```tsx
useEffect(() => {
  function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}, [onClose]);
```

Regras:
- Backdrop `bg-black/40` (ou `/60` para modais de mídia/imagem).
- Superfície `bg-[var(--surface-card)]` + `border-[var(--border-color)]` + `rounded-2xl`.
- Fechar por **Esc** e por **clique-fora** (exceto gates — ver abaixo).
- Componente base opcional: [`UxModalPortal`](../../src/uxpilot-ui/adapters/UxModalPortal.tsx).

## Exceções legítimas (não dispensáveis)

- **Gates** que bloqueiam o app até uma ação não têm Esc/clique-fora.
  Ex.: [`BillingGateModal`](../../src/components/billing/BillingGateModal.tsx) (assinatura
  vencida/suspensa). Mantido propositalmente sem fechar.
- **Drawers** laterais (ex.: `BudgetEditDrawer`) usam layout próprio (lateral), não centrado.
- **Modal full-screen mobile** do menu do usuário tem botão de voltar dedicado.

## Correções aplicadas (2026-06-24)

| Modal | Antes | Agora |
|---|---|---|
| [`WelcomeBackModal`](../../src/components/WelcomeBackModal.tsx) | `ui-card`, `bg-black/60`, sem Esc | superfície padrão, `bg-black/40`, Esc + clique-fora |
| [`CreativeCompareModal`](../../src/components/creatives/CreativeCompareModal.tsx) | `bg-black/70`, sem borda, sem Esc | `bg-black/60`, borda padrão, Esc (só estilo — sem mexer na lógica de criativos) |
| [`LegalModal`](../../src/components/auth/LegalModal.tsx) (novo) | — | criado já no padrão (Esc + clique-fora) |

Já no padrão: `DashboardCustomizeModal`, `MetricPickerModal`, `AudienceDetailModal`,
`CreativePreviewModal`, `ObjectiveSelectModal`, etc.

## Pendências / observações

- Auditar os modais ainda não revisados individualmente (lista no inventário) e migrar os que
  divergirem para o padrão. Considerar extrair um `<Modal>` base único no futuro.

## Histórico de mudanças relevantes
- 2026-06-24: Padrão documentado; corrigidos WelcomeBackModal e CreativeCompareModal; LegalModal criado no padrão.
