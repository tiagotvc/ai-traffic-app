export default function NewCampaignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-campaign-creator-shell
      className="app-shell-breakout flex min-h-0 flex-1 flex-col"
      style={{ background: "var(--surface-bg)" }}
    >
      {children}
    </div>
  );
}
