import type { ReactNode } from "react";

/** Campo de formulário com label do DS (`ui-label`). */
export function DsFormField({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="ui-label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/** Linha de ações alinhada à direita + mensagem de feedback. */
export function DsFormActions({
  children,
  message,
  className
}: {
  children: ReactNode;
  message?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex justify-end">{children}</div>
      {message ? <p className="mt-2 text-[11px] text-[var(--text-dimmer)]">{message}</p> : null}
    </div>
  );
}
