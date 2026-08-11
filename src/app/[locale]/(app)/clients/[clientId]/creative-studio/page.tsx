import { redirect } from "@/i18n/navigation";

/** Estúdio Criativo virou item próprio do menu (tenant-wide) — essa rota aninhada
 * segue existindo só como redirect pra não quebrar links antigos. */
export default async function ClientCreativeStudioPage({
  params
}: {
  params: Promise<{ locale: string; clientId: string }>;
}) {
  const { locale, clientId } = await params;
  redirect({ href: `/creative-studio?client=${encodeURIComponent(clientId)}`, locale });
}
