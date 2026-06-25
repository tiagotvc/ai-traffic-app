"use client";

import { ChevronDown, Mail, MapPin, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  MarketingContentCard,
  MarketingContentPage,
  MarketingContentSection
} from "@/components/marketing/MarketingContentPage";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { LEGAL_CONTACT, getSupportFaqs } from "@/lib/marketing/legal-content";

export function MarketingSupport() {
  const t = useTranslations("marketing");
  const locale = useLocale();
  const faqs = getSupportFaqs(locale);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      setForm({ name: "", email: "", company: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <MarketingContentPage badge={t("supportBadge")} title={t("supportTitle")} subtitle={t("supportSubtitle")}>
      <div className="grid gap-4 sm:grid-cols-2">
        <ContactCard
          icon={Mail}
          iconClass="bg-violet-500/15 text-violet-300"
          title={t("supportEmailTitle")}
          body={t("supportEmailBody")}
          email={LEGAL_CONTACT.supportEmail}
          note={`${locale === "en" ? LEGAL_CONTACT.supportResponseEn : LEGAL_CONTACT.supportResponse} ${locale === "en" ? LEGAL_CONTACT.supportHoursEn : LEGAL_CONTACT.supportHours}`}
        />
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <MapPin className="h-5 w-5" />
          </span>
          <h3 className="mt-3 font-heading text-sm font-semibold text-white">{t("supportLocationTitle")}</h3>
          <p className="mt-2 text-sm text-violet-200/70">{LEGAL_CONTACT.companyLocation}</p>
          <p className="mt-3 text-xs text-violet-200/50">
            <Link href="/data-deletion" className="font-medium text-amber-400 hover:text-amber-300">
              {t("supportDataDeletionLink")}
            </Link>
          </p>
        </article>
      </div>

      <MarketingContentCard>
        <MarketingContentSection title={t("supportFormTitle")}>
          <p className="mb-4 text-sm text-violet-200/70">{t("supportFormHint")}</p>
          <form onSubmit={submitForm} className="grid gap-3 sm:grid-cols-2">
            <Field label={t("supportFormName")} value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} required />
            <Field label={t("supportFormEmail")} type="email" value={form.email} onChange={(v) => setForm((s) => ({ ...s, email: v }))} required />
            <Field label={t("supportFormCompany")} value={form.company} onChange={(v) => setForm((s) => ({ ...s, company: v }))} className="sm:col-span-2" />
            <Field label={t("supportFormSubject")} value={form.subject} onChange={(v) => setForm((s) => ({ ...s, subject: v }))} className="sm:col-span-2" required />
            <label className="sm:col-span-2 block">
              <span className="mb-1 block text-xs font-medium text-violet-200/80">{t("supportFormMessage")}</span>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-bold text-[#0f1419] shadow-lg shadow-amber-500/20 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {status === "sending" ? t("supportFormSending") : t("supportFormSubmit")}
              </button>
              {status === "sent" ? (
                <span className="text-xs font-medium text-emerald-300">{t("supportFormSent")}</span>
              ) : null}
              {status === "error" ? (
                <span className="text-xs font-medium text-red-300">{t("supportFormError")}</span>
              ) : null}
            </div>
          </form>
        </MarketingContentSection>
      </MarketingContentCard>

      <MarketingContentCard>
        <MarketingContentSection title={t("supportFaqTitle")}>
          <div className="mt-4 space-y-2">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div key={faq.question} className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium text-white">{faq.question}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-violet-300/70 transition", open && "rotate-180")} />
                  </button>
                  {open ? (
                    <div className="border-t border-white/10 px-4 py-3 text-sm leading-relaxed text-violet-200/75">{faq.answer}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </MarketingContentSection>
      </MarketingContentCard>

      <p className="text-center text-sm text-violet-200/65">{t("supportClosing")}</p>
    </MarketingContentPage>
  );
}

function ContactCard({
  icon: Icon,
  iconClass,
  title,
  body,
  email,
  note,
  linkHref,
  linkLabel
}: {
  icon: typeof Mail;
  iconClass: string;
  title: string;
  body: string;
  email: string;
  note?: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", iconClass)}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 font-heading text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-violet-200/70">{body}</p>
      <a href={`mailto:${email}`} className="mt-3 inline-block text-sm font-semibold text-amber-400 hover:text-amber-300">
        {email}
      </a>
      {note ? <p className="mt-2 text-xs text-violet-200/50">{note}</p> : null}
      {linkHref && linkLabel ? (
        <p className="mt-2">
          <Link href={linkHref} className="text-xs font-medium text-amber-400 hover:text-amber-300">
            {linkLabel}
          </Link>
        </p>
      ) : null}
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  className
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium text-violet-200/80">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none ring-amber-400/30 focus:ring-2"
      />
    </label>
  );
}
