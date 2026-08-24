"use client";

import { useEffect, useRef, useState } from "react";

import { useReducedMotion } from "@/components/marketing/motion/useReducedMotion";

/**
 * Vídeo de produto com poster real. Fora do hero, só monta quando chega perto da tela,
 * evitando baixar as três gravações de uma vez na abertura da home.
 */
export function MarketingDemoVideo({
  src,
  poster,
  alt,
  eager = false,
  className = ""
}: {
  src: string;
  poster: string;
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const hostRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(eager);

  useEffect(() => {
    if (eager || reduced || nearViewport) return;
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px" }
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [eager, nearViewport, reduced]);

  return (
    <div ref={hostRef} className={className}>
      {nearViewport && !reduced ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload={eager ? "auto" : "metadata"}
          poster={poster}
          aria-label={alt}
          className="block h-full w-full object-cover"
        >
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt={alt} className="block h-full w-full object-cover" loading={eager ? "eager" : "lazy"} />
      )}
    </div>
  );
}
