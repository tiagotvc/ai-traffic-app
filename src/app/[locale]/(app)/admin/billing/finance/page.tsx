import { AdminBillingNav } from "@/components/billing/AdminBillingNav";
import { AdminFinanceClient } from "@/components/billing/AdminFinanceClient";

export default function AdminBillingFinancePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminBillingNav />
      <AdminFinanceClient />
    </div>
  );
}
