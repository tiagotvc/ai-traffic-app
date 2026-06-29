import { MarketingShell } from "@/components/marketing/MarketingShell";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  // Mesmo header/footer do site (com o dropdown "Políticas") — consistência entre
  // páginas de marketing e legais.
  return <MarketingShell>{children}</MarketingShell>;
}
