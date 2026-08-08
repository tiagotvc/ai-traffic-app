"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { SignupCta } from "@/components/marketing/SignupCta";

export function LandingStickyCta() {
  const t = useTranslations("marketing");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <>
      <div className="marketing-sticky-cta md:hidden">
        <SignupCta
          location="sticky_mobile"
          className="marketing-fab-cta block w-full rounded-xl py-3 text-center text-sm font-bold"
        >
          {t("startFree")}
        </SignupCta>
      </div>

      <div className="fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 md:block">
        <SignupCta
          location="sticky_desktop"
          className="marketing-fab-cta inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold"
        >
          {t("startFree")}
        </SignupCta>
      </div>
    </>
  );
}
