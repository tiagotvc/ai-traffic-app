"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { trackEvent, trackMetaEvent } from "@/lib/analytics";
import { appendAttribution, pickAttribution } from "@/lib/analytics/attribution";

/**
 * CTA de cadastro das páginas públicas. Faz duas coisas que um `Link` cru não faz:
 *
 *  1. Carrega os parâmetros de campanha da URL atual para o /login, para a origem sobreviver
 *     até o cadastro sem precisar gravar nada no dispositivo (ver
 *     [[src/lib/analytics/attribution.ts]] para o porquê de não usar cookie).
 *  2. Dispara `cta_click` (GA4) e `Lead` (Meta) no clique — ambos já bloqueados por
 *     consentimento dentro de [[src/lib/analytics.ts]].
 *
 * `location` identifica de onde veio o clique (hero, header, sticky…), pra dar pra
 * comparar qual botão converte melhor.
 */
export function SignupCta({
  location,
  className,
  children,
  callbackUrl = "/dashboard",
  onClick
}: {
  location: string;
  className?: string;
  children: ReactNode;
  callbackUrl?: string;
  /** Extra do chamador (ex.: fechar o menu mobile). Roda junto com o rastreio. */
  onClick?: () => void;
}) {
  return (
    // useSearchParams exige Suspense; sem atribuição o link ainda funciona.
    <Suspense
      fallback={
        <SignupCtaLink
          location={location}
          className={className}
          callbackUrl={callbackUrl}
          href={null}
          onClick={onClick}
        >
          {children}
        </SignupCtaLink>
      }
    >
      <SignupCtaInner
        location={location}
        className={className}
        callbackUrl={callbackUrl}
        onClick={onClick}
      >
        {children}
      </SignupCtaInner>
    </Suspense>
  );
}

function SignupCtaInner({
  location,
  className,
  children,
  callbackUrl,
  onClick
}: {
  location: string;
  className?: string;
  children: ReactNode;
  callbackUrl: string;
  onClick?: () => void;
}) {
  const searchParams = useSearchParams();
  const attribution = pickAttribution(new URLSearchParams(searchParams?.toString() ?? ""));
  const href = appendAttribution(
    `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    attribution
  );

  return (
    <SignupCtaLink
      location={location}
      className={className}
      callbackUrl={callbackUrl}
      href={href}
      onClick={onClick}
    >
      {children}
    </SignupCtaLink>
  );
}

function SignupCtaLink({
  location,
  className,
  children,
  callbackUrl,
  href,
  onClick
}: {
  location: string;
  className?: string;
  children: ReactNode;
  callbackUrl: string;
  href: string | null;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href ?? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
      className={className}
      onClick={() => {
        trackEvent("cta_click", { cta: location });
        void trackMetaEvent("Lead", { customData: { content_name: `cta_${location}` } });
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}
