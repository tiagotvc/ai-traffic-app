import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LandingPage } from "@/components/marketing/LandingPage";
import { buildAlternates, SITE_URL } from "@/lib/seo";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("marketing");
  const title = t("metaTitle");
  const description = t("metaDescription");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pt_BR",
      alternateLocale: ["en_US"],
      siteName: "Orion Agency",
      images: [{ url: `${SITE_URL}/og-landing.png`, width: 1200, height: 630, alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    },
    alternates: buildAlternates(locale, "")
  };
}

function LandingJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Orion Agency",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
      description: "7-day free trial"
    }
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}

export default function MarketingHomePage() {
  return (
    <>
      <LandingJsonLd />
      <LandingPage />
    </>
  );
}
