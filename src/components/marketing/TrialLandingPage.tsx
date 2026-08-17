import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { LandingFunnelBeacon } from "@/components/marketing/LandingFunnelBeacon";
import { SignupCta } from "@/components/marketing/SignupCta";
import { TrialLandingProductFrame } from "@/components/marketing/TrialLandingProductFrame";
import { Link } from "@/i18n/navigation";
import { getTrialLandingPricing } from "@/lib/marketing/trial-landing-pricing";
import {
  TRIAL_LANDING_FEATURES,
  TRIAL_LANDING_MEDIA,
  type TrialLandingFeature
} from "@/lib/marketing/trial-landing-variants";

/**
 * Landing de tráfego pago. Uma página, um objetivo: começar o teste.
 *
 * Não é o site institucional reduzido, é outra peça: sem menu, sem comparativo de
 * stack, sem FAQ, sem tabela de planos. Cada bloco a mais aqui é uma chance a mais de a
 * pessoa sair sem se cadastrar.
 *
 * A rota de cada produto faz o message match com o anúncio: troca herói, screenshot,
 * bloco de prova e as meta tags; o resto é idêntico. Assim a implementação e a
 * mensuração continuam compartilhadas (ver
 * [[src/lib/marketing/trial-landing-variants.ts]]).
 *
 * `?preview=1` liga o alternador das três variantes, pra revisar as três sem editar URL
 * na mão. Fora disso ele não existe na página.
 *
 * `noindex` de propósito: página de anúncio não disputa busca com a home, e as URLs
 * daqui carregam utm_*.
 *
 * A página lê os planos no banco, então nunca é pré-renderizada: sem isto o Next tenta
 * gerar caminho estático, carrega o TypeORM no worker de build e o worker morre.
 */
export type TrialLandingSearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateTrialLandingMetadata(feature: TrialLandingFeature): Promise<Metadata> {
  const t = await getTranslations("trialLanding");
  const locale = await getLocale();
  const { trialDays } = await getTrialLandingPricing(locale);

  return {
    title: t(`variants.${feature}.metaTitle`),
    description: t(`variants.${feature}.metaDescription`, { days: trialDays }),
    robots: { index: false, follow: true }
  };
}

/** Largura única de todos os blocos, igual em toda a página. */
function Wrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-[min(1160px,calc(100%-40px))] ${className}`}>{children}</div>;
}

function MiniList({ items }: { items: string[] }) {
  return (
    <ul className="lp-mini-list mt-6 grid list-none gap-3 p-0">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** Alternador de variantes, só com `?preview=1`. Links puros: funcionam sem JS. */
function PreviewSwitch({
  current,
  label
}: {
  current: TrialLandingFeature;
  label: string;
}) {
  return (
    <div
      aria-label={label}
      className="fixed bottom-4 left-1/2 z-[90] flex -translate-x-1/2 gap-1 rounded-xl border border-[var(--lp-border)] bg-[rgba(8,12,17,0.92)] p-1.5 shadow-2xl shadow-black/40 backdrop-blur-lg"
    >
      {TRIAL_LANDING_FEATURES.map((feature) => (
        <Link
          key={feature}
          href={`${
            feature === "relatorios"
              ? "/relatorios"
              : feature === "criativos"
                ? "/criativos"
                : "/cockpit"
          }?preview=1`}
          className={`rounded-md px-2.5 py-2 text-[11px] transition ${
            feature === current
              ? "bg-[#1a2230] text-white"
              : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
          }`}
        >
          {feature}
        </Link>
      ))}
    </div>
  );
}

export async function TrialLandingFeaturePage({
  feature,
  searchParams
}: {
  feature: TrialLandingFeature;
  searchParams: TrialLandingSearchParams;
}) {
  const t = await getTranslations("trialLanding");
  const locale = await getLocale();
  const resolved = await searchParams;
  const v = (key: string) => t(`variants.${feature}.${key}`);

  // Preço e duração do trial saem dos planos ativos, não do arquivo de tradução.
  const { entryPrice, trialDays } = await getTrialLandingPricing(locale);
  const media = TRIAL_LANDING_MEDIA[feature];

  const cards = [
    { icon: "▦", eyebrow: t("card1Eyebrow"), title: t("card1Title"), body: t("card1Body") },
    { icon: "↗", eyebrow: t("card2Eyebrow"), title: t("card2Title"), body: t("card2Body") },
    { icon: "▤", eyebrow: t("card3Eyebrow"), title: t("card3Title"), body: t("card3Body") }
  ];

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") }
  ];

  return (
    <>
      {/* Segmentado pela variante: dá pra comparar a conversão de cada anúncio. */}
      <LandingFunnelBeacon page={`teste:${feature}`} />

      {/* HERÓI */}
      <section className="relative overflow-hidden pb-12 pt-11 sm:pt-[54px] lg:pb-[48px] lg:pt-[74px]">
        <div
          aria-hidden
          className="pointer-events-none absolute left-[58%] top-[-35%] h-[560px] w-[560px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,.15), rgba(124,58,237,0) 67%)"
          }}
        />
        <Wrap className="relative grid items-center gap-11 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-[62px]">
          <div>
            <div className="lp-eyebrow mb-[18px]">{v("eyebrow")}</div>
            <h1 className="max-w-[720px] text-balance font-heading text-[38px] font-bold leading-[1.03] tracking-[-0.025em] text-[var(--text-main)] sm:text-[clamp(42px,5vw,66px)] sm:leading-[1.01]">
              {v("title")}
            </h1>
            <p className="mt-[23px] max-w-[610px] text-base leading-[1.62] text-[var(--text-dim)] sm:text-[18px]">
              {v("subtitle")}
            </p>
            <div className="mt-[31px] flex flex-col items-stretch gap-[18px] sm:flex-row sm:flex-wrap sm:items-center">
              <SignupCta location={`hero:${feature}`} className="lp-btn lp-btn-primary">
                {t("ctaHero")} <span aria-hidden="true">→</span>
              </SignupCta>
              <span className="text-center text-xs leading-[1.45] text-[var(--text-dimmer)] sm:text-left">
                {t("microHero", { days: trialDays })}
              </span>
            </div>
          </div>

          <div className="relative">
            <TrialLandingProductFrame media={media} alt={v("imageAlt")} priority />
            <div className="lp-demo-label">{t("realScreenLabel")}</div>
            <div className="lp-note">
              <strong className="font-mono text-[12px] font-bold uppercase leading-[1.4] tracking-[0.08em] text-[var(--lp-violet-soft)]">
                {v("noteTitle")}
              </strong>
              <p className="mt-[7px] text-[13px] leading-[1.45] text-[var(--text-dim)]">
                {v("noteBody")}
              </p>
            </div>
          </div>
        </Wrap>
      </section>

      {/* QUALIFICAÇÃO — diz pra quem é antes de a pessoa gastar tempo lendo o resto. */}
      <div className="border-y border-[var(--lp-border-soft)] bg-[#0d1218]">
        <Wrap className="flex flex-col items-start justify-between gap-5 py-6 sm:flex-row sm:items-center sm:gap-7">
          <strong className="font-heading text-[15px] font-bold text-[var(--text-main)]">
            {t("qualifierTitle")}
          </strong>
          <div className="flex flex-wrap gap-2.5 sm:justify-end">
            <span className="lp-qitem">{t("qualifier1")}</span>
            <span className="lp-qitem">{t("qualifier2")}</span>
            <span className="lp-qitem">{t("qualifier3", { days: trialDays })}</span>
            <span className="lp-qitem">{t("qualifier4")}</span>
          </div>
        </Wrap>
      </div>

      {/* PROVA — muda junto com a variante, pra não prometer no herói e entregar outra
          coisa dois blocos abaixo. */}
      <section className="lp-alt py-[68px] lg:py-[84px]">
        <Wrap className="grid items-center gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10">
          <div className="relative">
            <TrialLandingProductFrame media={media} alt={v("imageAlt")} />
          </div>
          <div>
            <div className="lp-eyebrow">{v("proofEyebrow")}</div>
            <h2 className="mt-3 max-w-[590px] text-balance font-heading text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-[var(--text-main)] sm:text-[clamp(30px,3.4vw,46px)]">
              {v("proofTitle")}
            </h2>
            <p className="mt-4 max-w-[560px] text-base leading-[1.66] text-[var(--text-dim)]">
              {v("proofBody")}
            </p>
            <MiniList items={[v("proofItem1"), v("proofItem2"), v("proofItem3")]} />
            <div className="mt-[26px]">
              <SignupCta location={`demo:${feature}`} className="lp-btn lp-btn-secondary">
                {t("ctaDemo")}
              </SignupCta>
            </div>
          </div>
        </Wrap>
      </section>

      {/* TRÊS DORES */}
      <section className="py-[68px] lg:py-[84px]">
        <Wrap>
          <div className="mb-9 max-w-[760px]">
            <div className="lp-eyebrow mb-3">{t("cardsEyebrow")}</div>
            <h2 className="text-balance font-heading text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-[var(--text-main)] sm:text-[clamp(30px,3.4vw,46px)]">
              {t("cardsTitle")}
            </h2>
          </div>
          <div className="grid gap-[18px] md:grid-cols-3">
            {cards.map((card) => (
              <article key={card.eyebrow} className="lp-card md:min-h-[230px]">
                <div className="lp-card-icon font-bold">{card.icon}</div>
                <div className="lp-eyebrow mt-[21px] !text-[10px]">{card.eyebrow}</div>
                <h3 className="mt-2 font-heading text-[20px] font-bold leading-[1.2] text-[var(--text-main)]">
                  {card.title}
                </h3>
                <p className="mt-[11px] text-sm leading-[1.55] text-[var(--text-dim)]">{card.body}</p>
              </article>
            ))}
          </div>
        </Wrap>
      </section>

      {/* TRÊS PASSOS — tira o medo de projeto de implantação, que é a objeção que
          segura gestor de tráfego pra experimentar ferramenta nova. */}
      <section className="lp-alt py-[68px] lg:py-[84px]">
        <Wrap>
          <div className="mb-9 max-w-[760px]">
            <div className="lp-eyebrow mb-3">{t("stepsEyebrow")}</div>
            <h2 className="text-balance font-heading text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-[var(--text-main)] sm:text-[clamp(30px,3.4vw,46px)]">
              {t("stepsTitle")}
            </h2>
            <p className="mt-4 text-base leading-[1.65] text-[var(--text-dim)]">{t("stepsBody")}</p>
          </div>
          <div className="lp-steps grid gap-[18px] md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="lp-step">
                <h3 className="mt-4 font-heading text-[20px] font-bold leading-[1.2] text-[var(--text-main)]">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-[1.55] text-[var(--text-dim)]">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-[34px] flex flex-col items-stretch gap-[18px] sm:flex-row sm:flex-wrap sm:items-center">
            <SignupCta location={`steps:${feature}`} className="lp-btn lp-btn-primary">
              {t("ctaSteps")} <span aria-hidden="true">→</span>
            </SignupCta>
            <span className="text-center text-xs text-[var(--text-dimmer)] sm:text-left">
              {t("microSteps")}
            </span>
          </div>
        </Wrap>
      </section>

      {/* AUTOMAÇÃO — supervisionada, nunca "a IA mexe sozinha na conta". */}
      <section className="py-[68px] lg:py-[84px]">
        <Wrap className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-[46px]">
          <div>
            <div className="lp-eyebrow">{t("automationEyebrow")}</div>
            <h2 className="mt-3 text-balance font-heading text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-[var(--text-main)] sm:text-[clamp(30px,3.4vw,46px)]">
              {t("automationTitle")}
            </h2>
            <p className="mt-4 text-base leading-[1.65] text-[var(--text-dim)]">
              {t("automationBody")}
            </p>
            <MiniList
              items={[t("automationPoint1"), t("automationPoint2"), t("automationPoint3")]}
            />
          </div>

          <div className="lp-action-card">
            <div className="lp-eyebrow !text-[10px]">{t("actionEyebrow")}</div>
            <h3 className="mt-2.5 font-heading text-[21px] font-bold leading-[1.2] text-[var(--text-main)]">
              {t("actionTitle")}
            </h3>
            <p className="mt-3 text-sm leading-[1.55] text-[var(--text-dim)]">{t("actionBody")}</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <span className="rounded-lg bg-gradient-to-br from-[var(--lp-indigo)] to-[var(--lp-purple)] px-3.5 py-2.5 font-heading text-xs font-bold text-white">
                {t("actionApprove")}
              </span>
              <span className="rounded-lg border border-[var(--lp-border)] px-3.5 py-2.5 font-heading text-xs font-bold text-[var(--text-dim)]">
                {t("actionDismiss")}
              </span>
            </div>
            <div className="mt-4 font-mono text-[10px] uppercase leading-[1.5] tracking-[0.08em] text-[var(--text-dimmer)]">
              {t("actionPending")}
            </div>
          </div>
        </Wrap>
      </section>

      {/* TESTE — o preço aparece de propósito: cadastro de quem acha que o produto é
          grátis pra sempre não vira cliente. */}
      <section className="lp-alt py-[68px] lg:py-[84px]">
        <Wrap>
          <div className="lp-trial grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:gap-11">
            <div>
              <div className="lp-eyebrow">{t("trialEyebrow")}</div>
              <h2 className="mt-3 max-w-[660px] text-balance font-heading text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-[var(--text-main)] sm:text-[clamp(30px,3.4vw,46px)]">
                {t("trialTitle", { days: trialDays })}
              </h2>
              <p className="mt-3.5 max-w-[660px] leading-[1.6] text-[var(--text-dim)]">
                {t("trialBody")}
              </p>
              <div className="mt-[22px] grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                <span className="lp-pill text-center sm:text-left">{t("trialPoint1")}</span>
                <span className="lp-pill text-center sm:text-left">{t("trialPoint2")}</span>
                <span className="lp-pill text-center sm:text-left">{t("trialPoint3")}</span>
                {entryPrice ? (
                  <span className="lp-pill text-center sm:text-left">
                    {t("trialPrice", { price: entryPrice })}
                  </span>
                ) : null}
              </div>
            </div>
            <SignupCta location={`trial:${feature}`} className="lp-btn lp-btn-primary">
              {t("ctaTrial")} <span aria-hidden="true">→</span>
            </SignupCta>
          </div>
        </Wrap>
      </section>

      {/* FECHAMENTO */}
      <section className="py-[68px] text-center lg:py-[90px]">
        <Wrap>
          <div className="lp-eyebrow">{t("finalEyebrow", { days: trialDays })}</div>
          <h2 className="mx-auto mt-3 max-w-[760px] text-balance font-heading text-[30px] font-bold leading-[1.08] tracking-[-0.025em] text-[var(--text-main)] sm:text-[clamp(30px,3.4vw,46px)]">
            {t("finalTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-[620px] text-base leading-[1.6] text-[var(--text-dim)]">
            {t("finalBody")}
          </p>
          <div className="mt-[31px] flex flex-col items-stretch justify-center gap-[18px] sm:flex-row sm:flex-wrap sm:items-center">
            <SignupCta location={`final:${feature}`} className="lp-btn lp-btn-primary">
              {t("ctaFinal")} <span aria-hidden="true">→</span>
            </SignupCta>
            <span className="text-xs text-[var(--text-dimmer)]">
              {entryPrice
                ? t("microFinal", { price: entryPrice })
                : t("microFinalNoPrice")}
            </span>
          </div>
        </Wrap>
      </section>

      {resolved.preview === "1" ? (
        <PreviewSwitch current={feature} label={t("previewLabel")} />
      ) : null}
    </>
  );
}
