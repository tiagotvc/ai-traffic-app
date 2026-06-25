"use client";

import { useTranslations } from "next-intl";
import { ChevronRight, Home, Info, LifeBuoy, ScrollText, Shield, Trash2 } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const LEGAL_NAV = [
  { href: "/legal/support", key: "support", icon: LifeBuoy },
  { href: "/legal/about", key: "about", icon: Info },
  { href: "/legal/terms", key: "terms", icon: ScrollText },
  { href: "/legal/privacy", key: "privacy", icon: Shield },
  { href: "/legal/data-deletion", key: "dataDeletion", icon: Trash2 }
] as const;

export function AppInstitutionalShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const current = LEGAL_NAV.find((item) => pathname === item.href) ?? LEGAL_NAV[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {/* Header sem fundo: breadcrumb (esta tela não segue o PageToolbar das demais) + tabs em pílula. */}
      <div className="mx-auto w-full max-w-4xl px-4 pt-6 md:px-6">
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-[var(--text-dimmer)] transition hover:text-[var(--text-main)]"
          >
            <Home size={13} />
            {t("home")}
          </Link>
          <ChevronRight size={12} className="shrink-0 text-[var(--text-dimmer)] opacity-60" />
          <span className="text-[var(--text-dimmer)]">{t("supportSection")}</span>
          <ChevronRight size={12} className="shrink-0 text-[var(--text-dimmer)] opacity-60" />
          <span className="font-medium text-[var(--text-main)]">{t(current.key)}</span>
        </nav>

        <nav
          className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={t("supportSection")}
        >
          {LEGAL_NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "border-[rgba(124,58,237,0.35)] bg-[rgba(124,58,237,0.10)] text-[var(--violet-bright)] shadow-sm"
                    : "border-[var(--border-color)] text-[var(--text-dim)] hover:border-[rgba(124,58,237,0.25)] hover:bg-[var(--surface-bg)] hover:text-[var(--text-main)]"
                )}
              >
                <Icon size={13} className="shrink-0" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</div>
    </div>
  );
}
