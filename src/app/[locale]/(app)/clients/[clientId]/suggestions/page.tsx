import { redirect } from "@/i18n/navigation";

export default async function ClientSuggestionsPage({
  params
}: {
  params: Promise<{ locale: string; clientId: string }>;
}) {
  const { locale, clientId } = await params;
  redirect({
    href: `/creative-memory?client=${encodeURIComponent(clientId)}&tab=suggestions`,
    locale
  });
}
