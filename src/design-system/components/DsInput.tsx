import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/** Input canônico. A aparência vem dos tokens `.ui-input` do tema ativo. */
export const DsInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function DsInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn("ui-input w-full", className)} {...props} />;
  }
);
