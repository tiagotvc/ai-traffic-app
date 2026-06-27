import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LandingPage } from "@/components/marketing/LandingPage";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://orionagency.com.br";

export async function generateMetadata(): Promise<Metadata> {
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
    alternates: {
      canonical: "/"
    }
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
