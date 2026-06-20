export default function NewCampaignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-campaign-creator-shell
      className="-mx-4 -mb-4 flex h-[calc(100dvh-4.25rem)] min-h-0 flex-col max-lg:h-[calc(100dvh-7.75rem)] md:-mx-6 lg:-mb-7"
      style={{ background: "var(--surface-bg)" }}
    >
      {children}
    </div>
  );
}
