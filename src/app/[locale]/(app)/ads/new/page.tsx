import { redirect } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ client?: string }>;
};

export default async function AdsNewRedirectPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const qs = sp.client ? `?client=${encodeURIComponent(sp.client)}` : "";
  redirect({ href: `/campaigns/new${qs}`, locale });
}
