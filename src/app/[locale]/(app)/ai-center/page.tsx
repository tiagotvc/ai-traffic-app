import { redirect } from "@/i18n/navigation";

export default async function AiCenterPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/agency-brain/suggestions", locale });
}
