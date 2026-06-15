"use client";

import { AdminBillingNav } from "@/components/billing/AdminBillingNav";

export function AdminBillingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full space-y-6">
      <AdminBillingNav />
      {children}
    </div>
  );
}
