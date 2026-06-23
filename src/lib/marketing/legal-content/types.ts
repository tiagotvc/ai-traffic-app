export type LegalSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
  /** Paragraphs rendered after bullet lists, when needed. */
  tail?: string[];
};

export type LegalPageContent = {
  badge: string;
  title: string;
  subtitle?: string;
  intro?: string;
  sections: LegalSection[];
  footerNote?: string;
};

export type LegalLocale = "pt-BR" | "en";
