"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

/** Botão flutuante "voltar ao topo" para páginas longas (scroll da janela). */
export function BackToTopButton({ label = "Voltar ao topo" }: { label?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={label}
      title={label}
      className="ui-btn-accent fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg shadow-black/30 transition print:hidden"
    >
      <ArrowUp size={20} strokeWidth={2.25} />
    </button>
  );
}
