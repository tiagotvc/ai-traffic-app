"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ChoiceCardCheck } from "@/components/campaign-creator/BudgetChoiceCard";
import { CreationModeChoiceGrid } from "@/components/campaign-creator/CreationModeChoiceCard";
import { CreatorModalShell } from "@/components/campaign-creator/CreatorModalShell";
import { cn } from "@/lib/cn";
import { RULE_TEMPLATES } from "@/lib/automation/rule-templates";

const CUSTOM = "custom";

/** Card de seleção compacto (variante template-tile do DS) — esquerda, com check. */
function RuleChoiceCard({
  selected,
  title,
  description,
  icon: Icon,
  onSelect
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: LucideIcon;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "campaign-creator-budget-choice-card campaign-creator-budget-choice-card--template-tile",
        selected
          ? "campaign-creator-budget-choice-card--selected"
          : "campaign-creator-budget-choice-card--unselected"
      )}
    >
      <ChoiceCardCheck selected={selected} />
      <span
        className={cn(
          "campaign-creator-budget-choice-card__icon",
          selected
            ? "campaign-creator-budget-choice-card__icon--selected"
            : "campaign-creator-budget-choice-card__icon--unselected"
        )}
        aria-hidden
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="campaign-creator-budget-choice-card__content">
        <span className="campaign-creator-budget-choice-card__label">{title}</span>
        <span className="campaign-creator-budget-choice-card__description">{description}</span>
      </span>
    </button>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  onSelectCustom: () => void;
  onSelectTemplate: (templateId: string) => void;
};

/**
 * Modal de escolha de criação de regra (padrão de fluxo de criação): card "Regra personalizada"
 * + cards de check dos templates. Ao continuar, navega para o stepper (vazio ou pré-preenchido).
 */
export function AutomationCreateModeModal({
  open,
  onClose,
  onSelectCustom,
  onSelectTemplate
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const templates = RULE_TEMPLATES.filter((t) => !t.soon && t.form);

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  function handleContinue() {
    if (!selected) return;
    if (selected === CUSTOM) onSelectCustom();
    else onSelectTemplate(selected);
  }

  return (
    <CreatorModalShell
      open={open}
      onClose={onClose}
      title="Nova regra"
      subtitle="Comece a partir de um modelo pronto ou monte do zero."
      width="xl"
      contentClassName="pb-8"
      onCancel={onClose}
      cancelLabel="Cancelar"
      onPrimary={handleContinue}
      primaryLabel="Continuar"
      primaryDisabled={selected === null}
      showPrimaryCheck={false}
    >
      <CreationModeChoiceGrid ariaLabel="Como criar a regra">
        <RuleChoiceCard
          selected={selected === CUSTOM}
          title="Regra personalizada"
          description="Monte sua própria condição e ação."
          icon={Plus}
          onSelect={() => setSelected(CUSTOM)}
        />
        {templates.map((tpl) => (
          <RuleChoiceCard
            key={tpl.id}
            selected={selected === tpl.id}
            title={tpl.title}
            description={tpl.desc}
            icon={tpl.icon}
            onSelect={() => setSelected(tpl.id)}
          />
        ))}
      </CreationModeChoiceGrid>
    </CreatorModalShell>
  );
}
