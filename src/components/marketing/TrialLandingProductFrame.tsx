"use client";

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
  const showVideo = Boolean(media.video) && !reduced;

  return (
    <div className="lp-browser">
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
            preload={priority ? "auto" : "metadata"}
            poster={media.image}
            aria-label={alt}
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
            decoding="async"
          />
        )}
      </div>
    </div>
  );
}
