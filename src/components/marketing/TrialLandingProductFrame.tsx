"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/components/marketing/motion/useReducedMotion";
import type { TrialLandingMedia } from "@/lib/marketing/trial-landing-variants";

/**
 * A tela do produto dentro de uma moldura de navegador. A moldura importa: comunica
 * "isto é a tela real" sem precisar escrever isso em lugar nenhum.
 *
 * Aceita imagem ou filmagem. Com filmagem, o vídeo roda sozinho, mudo e em loop, do
 * jeito que funciona em landing de anúncio: sem controles pra clicar, sem som pra
 * assustar quem está no celular no meio da rua, e `playsInline` porque sem ele o iPhone
 * abre em tela cheia por conta própria.
 *
 * Quem tem "reduzir movimento" ligado no sistema vê o poster parado. Autoplay não é
 * coisa que dê pra desligar por CSS, então a decisão é feita aqui.
 */
export function TrialLandingProductFrame({
  media,
  alt,
  priority = false
}: {
  media: TrialLandingMedia;
  alt: string;
  /** Mídia do herói: carrega imediatamente, é o que decide a primeira impressão. */
  priority?: boolean;
}) {
  const reduced = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [mobile, setMobile] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || mobile) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: "160px" }
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [mobile]);

  // Mobile receives the lightweight poster only. On larger screens, videos are
  // created lazily near the viewport instead of all downloading during startup.
  const showVideo = Boolean(media.video) && !reduced && !mobile && nearViewport;

  return (
    <div ref={frameRef} className="lp-browser">
      <div className="lp-browser-top">
        <span className="lp-dot" />
        <span className="lp-dot" />
        <span className="lp-dot" />
      </div>
      <div className="lp-stage">
        {showVideo && media.video ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={media.image}
            aria-label={alt}
            width={1915}
            height={902}
          >
            {media.video.webm ? <source src={media.video.webm} type="video/webm" /> : null}
            <source src={media.video.mp4} type="video/mp4" />
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.image}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
            width={1915}
            height={902}
          />
        )}
      </div>
    </div>
  );
}
