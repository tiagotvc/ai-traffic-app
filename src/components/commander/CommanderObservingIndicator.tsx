"use client";

import { Eye } from "lucide-react";

/**
 * Substitui os avisos/sugestões que o Commander empurrava a cada passo (motor de
 * regras local reavaliando um rascunho ainda incompleto). Ele continua acompanhando
 * por baixo, só não opina mais até a revisão final — isso aqui é só o sinal discreto
 * de que ele está mesmo acompanhando, não sumiu.
 */
export function CommanderObservingIndicator({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--creator-card-bg-inset,var(--surface-bg))] px-2.5 py-1.5 ${className}`}
    >
      <Eye size={12} className="shrink-0 text-[var(--ui-accent)]" />
      <span className="text-[10px] leading-none text-[var(--text-dimmer)]">
        Commander está observando o processo…
      </span>
    </div>
  );
}
