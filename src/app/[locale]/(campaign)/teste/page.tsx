import type { Metadata } from "next";
import { BarChart3, CheckCircle2, FileText, LayoutGrid } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { LandingFunnelBeacon } from "@/components/marketing/LandingFunnelBeacon";
import { LaptopMockup } from "@/components/marketing/LaptopMockup";
import { SignupCta } from "@/components/marketing/SignupCta";
import { getTrialLandingPricing } from "@/lib/marketing/trial-landing-pricing";
import {
  resolveTrialLandingFeature,
  TRIAL_LANDING_HERO_KEYS
} from "@/lib/marketing/trial-landing-variants";

/**
 * Landing de tráfego pago. Uma página, um objetivo: começar o teste.
 *
 * Não é o site institucional reduzido, é outra peça: sem menu, sem comparativo de
 * stack, sem FAQ, sem tabela de planos. Cada bloco a mais aqui é uma chance a mais de a
 * pessoa sair sem se cadastrar.
 *
 * O `?feature=` faz o message match com o anúncio sem exigir três páginas: só o herói
 * muda, o resto é idêntico. Assim o tráfego, a mensuração e o aprendizado ficam
 * concentrados num lugar só (ver [[src/lib/marketing/trial-landing-variants.ts]]).
 *
 * `noindex` de propósito: página de anúncio não disputa busca com a home, e as URLs
 * daqui carregam utm_*.
 */
/**
 * A página lê os planos no banco, então nunca é pré-renderizada: sem isto o Next tenta
 * gerar caminho estático, carrega o TypeORM no worker de build e o worker morre.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("trialLanding");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: true }
  };
}

export default async function TrialLandingPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("trialLanding");
  const locale = await getLocale();
  const resolved = await searchParams;
  const feature = resolveTrialLandingFeature(resolved.feature);
  const hero = TRIAL_LANDING_HERO_KEYS[feature];

  // Preço e duração do trial saem dos planos ativos, não do arquivo de tradução.
  const { entryPrice, trialDays } = await getTrialLandingPricing(locale);

  const pillars = [
    {
      icon: <LayoutGrid size={18} />,
      tag: t("pillarCockpitTag"),
      title: t("pillarCockpitTitle"),
      body: t("pillarCockpitBody")
    },
    {
      icon: <BarChart3 size={18} />,
      tag: t("pillarRankingTag"),
      title: t("pillarRankingTitle"),
      body: t("pillarRankingBody")
    },
    {
      icon: <FileText size={18} />,
      tag: t("pillarReportsTag"),
      title: t("pillarReportsTitle"),
      body: t("pillarReportsBody")
    }
  ];

  // Sem preço legível (banco fora do ar), a linha some em vez de mostrar um valor
  // inventado: promessa de preço na landing tem que bater com o checkout.
  const riskItems = [
    t("riskItem1"),
    t("riskItem2"),
    ...(entryPrice ? [t("riskItem3", { price: entryPrice })] : []),
    t("riskItem4")
  ];

  return (
    <>
      {/* Segmentado pela variante: dá pra comparar a conversão de cada anúncio. */}
      <LandingFunnelBeacon page={`teste:${feature}`} />

      {/* BLOCO 01 — Herói */}
      <section className="marketing-section !pb-10 !pt-10 sm:!pb-12 sm:!pt-14">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <h1 className="text-balance font-heading text-[1.75rem] font-bold leading-[1.15] tracking-tight text-[var(--text-main)] sm:text-4xl">
              {t(hero.headline)}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--text-dim)] sm:text-base">
              {t(hero.sub)}
            </p>
            {/* Botão ocupa a linha no celular: é onde quase todo o tráfego de Meta chega. */}
            <div className="mt-7 flex flex-col items-center gap-3 sm:items-start">
              <SignupCta
                location="teste_hero"
                className="ui-btn-accent w-full px-7 py-3.5 text-center text-sm font-semibold sm:w-auto"
              >
                {t("ctaPrimary")}
              </SignupCta>
              <p className="text-xs text-[var(--text-dimmer)]">{t("ctaNote", { days: trialDays })}</p>
            </div>
          </div>

          {/* Mídia do herói: screenshot real do produto, não mockup conceitual. O
              showcase codado fica pro bloco de baixo, pra não repetir a mesma imagem. */}
          <div className="flex justify-center lg:justify-end">
            <LaptopMockup src="/examples/dashboard.png" alt={t("heroMediaAlt")} />
          </div>
        </div>
      </section>

      {/* BLOCO 02 — Veja funcionando */}
      <section className="marketing-section marketing-section-alt !py-12 sm:!py-14">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="marketing-section-heading">{t("demoTitle")}</h2>
          <p className="marketing-section-sub mx-auto mt-3 max-w-xl">{t("demoBody")}</p>

          {/* Slot do vídeo de 20 a 30 segundos (cliente A → cliente B → ranking →
              relatório → automação), sem áudio obrigatório e em loop. Até ele existir,
              fica o screenshot real do ranking. É imagem, e não o showcase de
              componentes, porque no celular aquele empilha e vira metros de rolagem. */}
          <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-xl border border-[var(--border-color)] shadow-2xl shadow-black/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {/* Recortado no topo: é screenshot de tela larga e, inteiro, empurra o resto
                da página pra baixo sem contar nada a mais. */}
            <img
              src="/examples/creative-ranking.jpg"
              alt={t("demoMediaAlt")}
              className="block max-h-[300px] w-full object-cover object-top sm:max-h-[440px]"
            />
          </div>

          <div className="mt-8 flex justify-center">
            <SignupCta
              location="teste_demo"
              className="ui-btn-secondary w-full px-6 py-3 text-center text-sm font-semibold sm:w-auto"
            >
              {t("demoCta")}
            </SignupCta>
          </div>
        </div>
      </section>

      {/* BLOCO 03 — As três dores */}
      <section className="marketing-section !py-12 sm:!py-14">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-3">
          {pillars.map((pillar) => (
            <div key={pillar.tag} className="marketing-card h-full p-6">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
                {pillar.icon}
              </span>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-accent)]">
                {pillar.tag}
              </p>
              <h3 className="mt-1.5 font-heading text-base font-bold leading-snug text-[var(--text-main)]">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BLOCO 04 — Automação supervisionada. Depois das três dores de propósito: exige
          mais explicação e no topo custaria a atenção que o herói precisa. */}
      <section className="marketing-section marketing-section-alt !py-12 sm:!py-14">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="marketing-section-heading !text-left">{t("automationTitle")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">{t("automationBody")}</p>
          </div>

          <div className="marketing-card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-accent)]">
              {t("automationCardLabel")}
            </p>
            <h3 className="mt-2 font-heading text-base font-bold text-[var(--text-main)]">
              {t("automationCardTitle")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">
              {t("automationCardReason")}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="ui-btn-accent pointer-events-none px-4 py-2 text-xs font-semibold">
                {t("automationCardApprove")}
              </span>
              <span className="pointer-events-none rounded-[var(--btn-radius)] border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-dim)]">
                {t("automationCardDismiss")}
              </span>
            </div>
            <p className="mt-3 text-[11px] text-[var(--text-dimmer)]">{t("automationCardStatus")}</p>
          </div>
        </div>
      </section>

      {/* BLOCO 05 — Redução de risco. O preço aparece de propósito: cadastro de quem
          acha que o produto é grátis pra sempre não vira cliente. */}
      <section className="marketing-section !py-12 sm:!py-14">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="marketing-section-heading">{t("riskTitle", { days: trialDays })}</h2>
          <ul className="mx-auto mt-6 grid gap-3 text-left sm:grid-cols-2">
            {riskItems.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-[var(--text-main)]">
                <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--ui-accent)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* BLOCO 06 — CTA final */}
      <section className="marketing-section marketing-section-alt !py-14 sm:!py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="marketing-section-heading">{t("finalTitle")}</h2>
          <div className="mt-7 flex flex-col items-center gap-3">
            <SignupCta
              location="teste_footer"
              className="ui-btn-accent w-full px-8 py-3.5 text-center text-sm font-semibold sm:w-auto"
            >
              {t("finalCta", { days: trialDays })}
            </SignupCta>
            <p className="text-xs text-[var(--text-dimmer)]">{t("finalNote")}</p>
          </div>
        </div>
      </section>
    </>
  );
}
