export default function NewCampaignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-campaign-creator-shell
      className="-mx-4 -my-5 flex min-h-0 flex-1 flex-col md:-mx-6 [html[data-sidebar-collapsed]_&]:md:-mx-8"
      style={{ background: "var(--surface-bg)" }}
    >
      {children}
    </div>
  );
}
