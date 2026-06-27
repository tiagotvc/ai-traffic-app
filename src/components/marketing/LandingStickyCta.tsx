"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

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
    <div className="marketing-sticky-cta">
      <Link href="/login?callbackUrl=/dashboard" className="ui-btn-accent block w-full py-2.5 text-center text-sm font-semibold">
        {t("startFree")}
      </Link>
    </div>
  );
}
