"use client";

import { ChevronDown, Mail, MapPin, MessageCircle, Send, Shield } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  AppInstitutionalCard,
  AppInstitutionalContentPage,
  AppInstitutionalSection
} from "@/components/legal/AppInstitutionalContentPage";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { LEGAL_CONTACT, getSupportFaqs } from "@/lib/marketing/legal-content";

export function AppInstitutionalSupport() {
  const t = useTranslations("marketing");
  const locale = useLocale();
  const faqs = getSupportFaqs(locale);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [form, setForm] = useState({ name: "", email: "", company: "", subject: "", message: "" });

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const body = [
      form.message,
      form.company ? `\n\nEmpresa: ${form.company}` : "",
      `\n\nEnviado via formulário da Orion Agency`
    ].join("");
    const mailto = `mailto:${LEGAL_CONTACT.supportEmail}?subject=${encodeURIComponent(form.subject || "Contato Orion Agency")}&body=${encodeURIComponent(`Nome: ${form.name}\nE-mail: ${form.email}${body}`)}`;
    window.location.href = mailto;
  }

  return (
    <AppInstitutionalContentPage
      badge={t("supportBadge")}
      title={t("supportTitle")}
      subtitle={t("supportSubtitle")}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <ContactCard
          icon={Mail}
          iconClass="bg-violet-500/10 text-violet-600"
          title={t("supportEmailTitle")}
          body={t("supportEmailBody")}
          email={LEGAL_CONTACT.supportEmail}
          note={locale === "en" ? LEGAL_CONTACT.supportHoursEn : LEGAL_CONTACT.supportHours}
        />
        <ContactCard
          icon={MessageCircle}
          iconClass="bg-amber-500/10 text-amber-600"
          title={t("supportCommercialTitle")}
          body={t("supportCommercialBody")}
          email={LEGAL_CONTACT.commercialEmail}
        />
        <ContactCard
          icon={Shield}
          iconClass="bg-sky-500/10 text-sky-600"
          title={t("supportPrivacyTitle")}
          body={t("supportPrivacyBody")}
          email={LEGAL_CONTACT.privacyEmail}
          linkHref="/legal/privacy"
          linkLabel={t("supportPrivacyLink")}
        />
        <ContactCard
          icon={MapPin}
          iconClass="bg-emerald-500/10 text-emerald-600"
          title={t("supportLocationTitle")}
          body={LEGAL_CONTACT.companyLocation}
          email={LEGAL_CONTACT.supportEmail}
          linkHref="/legal/data-deletion"
          linkLabel={t("supportDataDeletionLink")}
        />
      </div>

      <AppInstitutionalCard>
        <AppInstitutionalSection title={t("supportFormTitle")}>
          <p className="mb-4 text-sm text-[var(--text-dim)]">{t("supportFormHint")}</p>
          <form onSubmit={submitForm} className="grid gap-3 sm:grid-cols-2">
            <Field label={t("supportFormName")} value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} required />
            <Field label={t("supportFormEmail")} type="email" value={form.email} onChange={(v) => setForm((s) => ({ ...s, email: v }))} required />
            <Field label={t("supportFormCompany")} value={form.company} onChange={(v) => setForm((s) => ({ ...s, company: v }))} className="sm:col-span-2" />
            <Field label={t("supportFormSubject")} value={form.subject} onChange={(v) => setForm((s) => ({ ...s, subject: v }))} className="sm:col-span-2" required />
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-[var(--text-dim)]">{t("supportFormMessage")}</span>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
                className="ui-input w-full resize-y"
              />
            </label>
            <div className="sm:col-span-2">
              <button type="submit" className="ui-btn-primary inline-flex items-center gap-2 text-sm">
                <Send size={14} />
                {t("supportFormSubmit")}
              </button>
            </div>
          </form>
        </AppInstitutionalSection>
      </AppInstitutionalCard>

      <AppInstitutionalCard>
        <AppInstitutionalSection title={t("supportFaqTitle")}>
          <div className="mt-2 space-y-2">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-bg)]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="text-sm font-medium text-[var(--text-main)]">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-[var(--text-dim)] transition",
                        open && "rotate-180"
                      )}
                    />
                  </button>
                  {open ? (
                    <div className="border-t border-[var(--border-color)] px-4 py-3 text-sm leading-relaxed text-[var(--text-dim)]">
                      {faq.answer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </AppInstitutionalSection>
      </AppInstitutionalCard>

      <p className="text-sm text-[var(--text-dim)]">{t("supportClosing")}</p>
    </AppInstitutionalContentPage>
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
    <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-card)] p-5">
      <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl", iconClass)}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 font-heading text-sm font-semibold text-[var(--text-main)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--text-dim)]">{body}</p>
      <a
        href={`mailto:${email}`}
        className="mt-3 inline-block text-sm font-semibold text-[var(--violet-bright)] hover:underline"
      >
        {email}
      </a>
      {note ? <p className="mt-2 text-xs text-[var(--text-dimmer)]">{note}</p> : null}
      {linkHref && linkLabel ? (
        <p className="mt-2">
          <Link href={linkHref} className="text-xs font-medium text-[var(--violet-bright)] hover:underline">
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
        className="ui-input w-full"
      />
    </label>
  );
}
