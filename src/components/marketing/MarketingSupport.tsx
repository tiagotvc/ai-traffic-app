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
        <article className="marketing-card p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ui-accent-muted)] text-[var(--ui-accent)]">
            <MapPin className="h-5 w-5" />
          </span>
          <h3 className="mt-3 font-heading text-sm font-semibold text-[var(--text-main)]">{t("supportLocationTitle")}</h3>
          <p className="mt-2 text-sm text-[var(--text-dim)]">{LEGAL_CONTACT.companyLocation}</p>
          <p className="mt-3 text-xs text-[var(--text-dimmer)]">
            <Link href="/data-deletion" className="marketing-link-accent">
              {t("supportDataDeletionLink")}
            </Link>
          </p>
        </article>
      </div>

      <MarketingContentCard>
        <MarketingContentSection title={t("supportFormTitle")}>
          <p className="mb-4 text-sm text-[var(--text-dim)]">{t("supportFormHint")}</p>
          <form onSubmit={submitForm} className="grid gap-3 sm:grid-cols-2">
            <Field label={t("supportFormName")} value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} required />
            <Field label={t("supportFormEmail")} type="email" value={form.email} onChange={(v) => setForm((s) => ({ ...s, email: v }))} required />
            <Field label={t("supportFormCompany")} value={form.company} onChange={(v) => setForm((s) => ({ ...s, company: v }))} className="sm:col-span-2" />
            <Field label={t("supportFormSubject")} value={form.subject} onChange={(v) => setForm((s) => ({ ...s, subject: v }))} className="sm:col-span-2" required />
            <label className="sm:col-span-2 block">
              <span className="mb-1 block text-xs font-medium text-[var(--text-dim)]">{t("supportFormMessage")}</span>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                className="marketing-form-input"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={status === "sending"}
                className="ui-btn-accent inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
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
                <div key={faq.question} className="marketing-card overflow-hidden p-0">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium text-[var(--text-main)]">{faq.question}</span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--text-dim)] transition", open && "rotate-180")} />
                  </button>
                  {open ? (
                    <div className="border-t border-[var(--border-color)] px-4 py-3 text-sm leading-relaxed text-[var(--text-dim)]">{faq.answer}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </MarketingContentSection>
      </MarketingContentCard>

      <p className="text-center text-sm text-[var(--text-dim)]">{t("supportClosing")}</p>
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
    <article className="marketing-card p-5">
      <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", iconClass)}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--text-dim)]">{body}</p>
      <a href={`mailto:${email}`} className="marketing-link-accent mt-3 inline-block text-sm font-semibold">
        {email}
      </a>
      {note ? <p className="mt-2 text-xs text-[var(--text-dimmer)]">{note}</p> : null}
      {linkHref && linkLabel ? (
        <p className="mt-2">
          <Link href={linkHref} className="marketing-link-accent text-xs font-medium">
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
      <span className="mb-1 block text-xs font-medium text-[var(--text-dim)]">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="marketing-form-input"
      />
    </label>
  );
}
