import { redirect } from "@/i18n/navigation";

export default async function ClientAgencyBrainPage({
  params
}: {
  params: Promise<{ locale: string; clientId: string }>;
}) {
  const { locale, clientId } = await params;
  redirect({
    href: `/agency-brain/learnings?client=${encodeURIComponent(clientId)}`,
    locale
  });
}
