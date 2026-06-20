import { TrendingUp, Users, DollarSign, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/uxpilot-ui/lib/utils";

const clientHealth = [
  { name: "TechVision Ltda", spend: "R$52.3K", roas: "5.2×", cpl: "R$14.20", status: "healthy", trend: "+12%" },
  { name: "BrandForce Corp", spend: "R$38.1K", roas: "3.8×", cpl: "R$22.40", status: "warning", trend: "-4%" },
  { name: "NovaMarca SA", spend: "R$29.7K", roas: "4.1×", cpl: "R$17.80", status: "healthy", trend: "+8%" },
  { name: "DigitalPrime", spend: "R$22.7K", roas: "4.9×", cpl: "R$15.60", status: "healthy", trend: "+21%" },
];

const healthMetrics = [
  { label: "Clientes Ativos", value: "12", icon: Users, color: "#4f46e5", change: "+2" },
  { label: "Contas Saudáveis", value: "9/12", icon: CheckCircle2, color: "#10b981", change: "75%" },
  { label: "Budget Utilizado", value: "87%", icon: DollarSign, color: "#f5a623", change: "R$142.8K" },
  { label: "Alertas Ativos", value: "7", icon: AlertCircle, color: "#ef4444", change: "2 críticos" },
];

interface Props {
  isEmptyState?: boolean;
}

export default function AgencyHealthLayout({ isEmptyState }: Props) {
  if (isEmptyState) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl p-4 border"
              style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
            >
              <div className="skeleton-shimmer h-3 w-24 rounded mb-3" />
              <div className="skeleton-shimmer h-8 w-16 rounded mb-2" />
              <div className="skeleton-shimmer h-2 w-20 rounded" />
            </div>
          ))}
        </div>
        <div
          className="rounded-xl border overflow-hidden"
          style={{ background: "var(--surface-card)", borderColor: "var(--border-color)" }}
        >
          <div className="p-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <div className="skeleton-shimmer h-4 w-32 rounded" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 border-b flex items-center gap-4"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div className="skeleton-shimmer h-3 w-32 rounded" />
              <div className="skeleton-shimmer h-3 w-20 rounded ml-auto" />
              <div className="skeleton-shimmer h-3 w-16 rounded" />
              <div className="skeleton-shimmer h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Health Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {healthMetrics.map((m, i) => (
          <div
            key={m.label}
            className="rounded-xl p-4 border transition-all cursor-default kpi-card-hover animate-fade-up"
            style={{
              background: "var(--surface-card)",
              borderColor: "var(--border-color)",
              animationDelay: `${i * 80}ms`,
              animationFillMode: "both",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${m.color}15` }}
              >
                <m.icon size={14} style={{ color: m.color }} />
              </div>
              <span className="text-[10px] font-body" style={{ color: "var(--text-dim)" }}>{m.change}</span>
            </div>
            <div className="font-heading font-bold text-xl" style={{ color: "var(--text-main)" }}>{m.value}</div>
            <div className="text-xs font-body mt-0.5" style={{ color: "var(--text-dim)" }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Client Health Table */}
      <div
        className="rounded-xl border overflow-hidden animate-fade-up"
        style={{
          background: "var(--surface-card)",
          borderColor: "var(--border-color)",
          animationDelay: "320ms",
          animationFillMode: "both",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--border-color)", background: "var(--surface-thead)" }}
        >
          <h4 className="font-heading font-semibold text-sm" style={{ color: "var(--text-main)" }}>Saúde dos Clientes</h4>
          <div className="flex items-center gap-1.5">
            <Clock size={12} style={{ color: "var(--text-dim)" }} />
            <span className="text-[11px] font-body" style={{ color: "var(--text-dim)" }}>Atualizado agora</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--surface-thead)" }}>
                {["Cliente", "Spend", "ROAS", "CPL", "Tendência", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-[10px] uppercase tracking-widest font-body"
                    style={{ color: "var(--text-dimmer)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientHealth.map((client, i) => (
                <tr
                  key={client.name}
                  className="border-b transition-colors cursor-pointer group"
                  style={{
                    borderColor: "var(--border-color)",
                    animationDelay: `${400 + i * 60}ms`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading font-bold flex-shrink-0"
                        style={{ background: "rgba(79,70,229,0.12)", color: "#7c3aed" }}
                      >
                        {client.name[0]}
                      </div>
                      <span className="font-body font-medium text-sm" style={{ color: "var(--text-main)" }}>{client.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-heading font-semibold text-sm" style={{ color: "var(--amber)" }}>
                    {client.spend}
                  </td>
                  <td className="px-4 py-3 font-heading font-semibold text-sm" style={{ color: "var(--success)" }}>
                    {client.roas}
                  </td>
                  <td className="px-4 py-3 font-body text-sm" style={{ color: "var(--text-main)" }}>
                    {client.cpl}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-body font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: client.trend.startsWith("+") ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                        color: client.trend.startsWith("+") ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {client.trend}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={client.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isHealthy = status === "healthy";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-body font-medium px-2.5 py-1 rounded-full"
      style={{
        background: isHealthy ? "rgba(16,185,129,0.12)" : "rgba(245,166,35,0.12)",
        color: isHealthy ? "#10b981" : "#f5a623",
      }}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full", isHealthy ? "" : "animate-pulse-amber")}
        style={{ background: isHealthy ? "#10b981" : "#f5a623" }}
      />
      {isHealthy ? "Saudável" : "Atenção"}
    </span>
  );
}