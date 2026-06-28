"use client";

import { useState } from "react";
import { Link, useUxLocation as useLocation } from "@/uxpilot-ui/adapters/navigation";
import {
  BarChart3,
  Bell,
  ChevronLeft,
  ChevronRight,
  Home,
  Lightbulb,
  Send,
  Settings,
  Users,
  UsersRound
} from "lucide-react";
import { cn } from "@/uxpilot-ui/lib/utils";
import { OrionAgencyLogo } from "@/components/brand/OrionAgencyLogo";

function NavSendSquareIcon({ size = 18 }: { size?: number }) {
  const inner = Math.max(10, size - 8);
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-[5px] border border-current/45 p-[3px]">
      <Send size={inner} strokeWidth={2} aria-hidden />
    </span>
  );
}

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard", customIcon: false },
  { icon: Users, label: "Clientes", path: "/clients", customIcon: false },
  { icon: Send, label: "Campanhas", path: "/campaigns", customIcon: true },
  { icon: UsersRound, label: "Públicos", path: "/audiences", customIcon: false },
  { icon: Lightbulb, label: "Aprendizados", path: "/agency-brain/learnings", customIcon: false },
  { icon: BarChart3, label: "Relatórios", path: "/reports", customIcon: false },
  { icon: Bell, label: "Alertas", path: "/alerts", customIcon: false },
  { icon: Settings, label: "Configurações", path: "/settings", customIcon: false }
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen transition-all duration-300 ease-in-out z-30",
        "border-r flex-shrink-0",
        collapsed ? "w-16" : "w-56"
      )}
      style={{
        background: "#0a0f14",
        borderColor: "rgba(255,255,255,0.05)"
      }}
    >
      <div
        className={cn(
          "flex items-center h-16 px-3 flex-shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className={cn("flex items-center min-w-0", collapsed ? "justify-center" : "")}>
          <OrionAgencyLogo size="sm" variant="dark" showText={!collapsed} />
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1 rounded-md hover:bg-white/5 transition-colors flex-shrink-0",
            collapsed && "hidden"
          )}
          style={{ color: "#94a3b8" }}
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center border transition-colors z-40"
          style={{ background: "#1d2630", borderColor: "rgba(255,255,255,0.05)", color: "#94a3b8" }}
        >
          <ChevronRight size={12} />
        </button>
      )}

      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden px-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center rounded-xl transition-all duration-200 group relative",
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                isActive ? "sidebar-item-active font-semibold" : "sidebar-item-idle font-medium"
              )}
            >
              {item.customIcon ? (
                <NavSendSquareIcon />
              ) : (
                <Icon size={18} strokeWidth={1.75} className="shrink-0" />
              )}
              {!collapsed ? (
                <span className="font-body text-[13px] flex-1 whitespace-nowrap">{item.label}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn("p-3", collapsed ? "flex justify-center" : "")}
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "" : "w-full gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-2"
          )}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
          >
            T
          </div>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium truncate text-[#f8fafc]">Tiago Carvalho</p>
                <p className="text-[11px] truncate text-[#94a3b8]">Admin</p>
              </div>
              <ChevronRight size={15} className="shrink-0 text-[#64748b]" />
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
