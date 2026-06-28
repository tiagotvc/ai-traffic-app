export default function NewClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-campaign-creator-shell
      data-wizard-footer-persistent
      className="app-shell-breakout flex min-h-0 flex-1 flex-col"
      style={{ background: "var(--surface-bg)" }}
    >
      {children}
    </div>
  );
}
