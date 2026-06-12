"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";

const LINKS = [
  { href: "/admin/billing/plans", key: "navPlans" as const },
  { href: "/admin/billing/coupons", key: "navCoupons" as const },
  { href: "/admin/billing/refunds", key: "navRefunds" as const }
];

export function AdminBillingNav() {
  const t = useTranslations("billingAdmin");
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {LINKS.map((link) => {
        const active = pathname?.includes(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              active
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
