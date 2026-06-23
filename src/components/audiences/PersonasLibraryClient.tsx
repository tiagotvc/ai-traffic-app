"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Plus, Sparkles, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { AiPersonaForm } from "@/components/audiences/create/AiPersonaForm";
import { DsPageHeader } from "@/design-system";

export type PersonaSummary = {
  id: string;
  name: string;
  description: string | null;
  ageMin: number;
  ageMax: number;
  gender: string;
  targeting: Record<string, unknown>;
  sourcePrompt: string | null;
  updatedAt: string;
};

type Props = {
  clientSlug?: string;
  adAccountId?: string;
};

export function PersonasLibraryClient({ clientSlug: clientSlugProp, adAccountId: adAccountIdProp }: Props) {
  const t = useTranslations("audiences");
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [clientSlug, setClientSlug] = useState(clientSlugProp ?? "");
  const [adAccountId, setAdAccountId] = useState(adAccountIdProp ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (clientSlugProp && adAccountIdProp) {
      setClientSlug(clientSlugProp);
      setAdAccountId(adAccountIdProp);
      return;
    }
    fetch("/api/audiences/hub")
      .then((r) => r.json())
      .then(
        (j: {
          ok?: boolean;
          clients?: Array<{
            slug: string;
            defaultAdAccountId: string | null;
            adAccounts: { metaAdAccountId: string }[];
          }>;
        }) => {
          const first = j.clients?.find(
            (c) => c.defaultAdAccountId || c.adAccounts.length > 0
          );
          if (!first) return;
          setClientSlug(first.slug);
          setAdAccountId(
            first.defaultAdAccountId ?? first.adAccounts[0]?.metaAdAccountId ?? ""
          );
        }
      )
      .catch(() => {});
  }, [clientSlugProp, adAccountIdProp]);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/personas")
      .then((r) => r.json())
      .then((j: { ok?: boolean; personas?: PersonaSummary[]; error?: string }) => {
        if (!j.ok) {
          setError(j.error ?? "Erro ao carregar personas");
          setPersonas([]);
          return;
        }
        setPersonas(j.personas ?? []);
        setError(null);
      })
      .catch(() => setError("Erro ao carregar personas"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <DsPageHeader title={t("personasLibraryTitle")} subtitle={t("personasLibrarySubtitle")} />
      <p className="text-xs font-medium" style={{ color: "var(--amber)" }}>
        {t("personasLibraryBadge")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="ui-btn-primary inline-flex items-center gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} />
          {t("newPersona")}
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--text-dim)]">{t("loadingPersonas")}</p>
      ) : personas.length === 0 ? (
        <div className="ui-card flex flex-col items-center gap-3 p-10 text-center">
          <Users size={32} className="text-[var(--text-dimmer)]" />
          <p className="text-sm text-[var(--text-dim)]">{t("noPersonasYet")}</p>
          <button type="button" className="ui-btn-brand inline-flex items-center gap-2" onClick={() => setShowCreate(true)}>
            <Sparkles size={16} />
            {t("createFirstPersona")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personas.map((p) => (
            <article key={p.id} className="ui-card space-y-2 p-4">
              <h3 className="font-heading text-[var(--text-main)]">{p.name}</h3>
              {p.description ? (
                <p className="line-clamp-3 text-sm text-[var(--text-dim)]">{p.description}</p>
              ) : null}
              <p className="text-xs text-[var(--text-dimmer)]">
                {p.ageMin}–{p.ageMax} · {p.gender}
              </p>
            </article>
          ))}
        </div>
      )}

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="ui-card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5">
            <AiPersonaForm
              clientSlug={clientSlug}
              adAccountId={adAccountId}
              onClose={() => setShowCreate(false)}
              onSaved={() => {
                setShowCreate(false);
                startTransition(() => load());
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
