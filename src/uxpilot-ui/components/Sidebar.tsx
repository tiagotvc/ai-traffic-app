"use client";

import { useState } from "react";
import { Link, useUxLocation as useLocation } from "@/uxpilot-ui/adapters/navigation";
import {
  LayoutDashboard,
  Brain,
  Megaphone,
  BarChart3,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  Users,
  Sun,
  Moon,
  Target,
  Trophy,
  ChevronRight as ChevronRightIcon,
  Globe,
  ChevronDown,
  LifeBuoy,
  ScrollText,
  Info,
} from "lucide-react";
import { cn } from "@/uxpilot-ui/lib/utils";
import { useTheme } from "@/uxpilot-ui/hooks/useTheme";

type Language = "PT-BR" | "EN" | "ES";
const languages: Language[] = ["PT-BR", "EN", "ES"];

const navItems = [
  { icon: LayoutDashboard, label: "Destaques", path: "/dashboard", badge: null, betaBadge: false },
  { icon: Users, label: "Clientes", path: "/clients", badge: null, betaBadge: false },
  { icon: Megaphone, label: "Campanhas", path: "/campaigns", badge: null, betaBadge: false },
  { icon: Target, label: "Públicos", path: "/audiences", badge: null, betaBadge: false },
  { icon: Trophy, label: "Ranking de Criativos", path: "/creatives", badge: null, betaBadge: false },
  { icon: Brain, label: "Agency Brain", path: "/agency-brain/learnings", badge: null, betaBadge: true },
  { icon: BarChart3, label: "Relatórios", path: "/reports", badge: null, betaBadge: false },
  { icon: Settings, label: "Automações", path: "/settings", badge: null, betaBadge: false },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  const [language, setLanguage] = useState<Language>("PT-BR");
  const [langOpen, setLangOpen] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen transition-all duration-300 ease-in-out z-30",
        "border-r flex-shrink-0",
        collapsed ? "w-16" : "w-56"
      )}
      style={{
        background: "#0a0f14",
        borderColor: "rgba(255,255,255,0.05)",
      }}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 px-3 flex-shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 animate-pulse-violet"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
            <Zap size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-heading font-700 text-sm leading-tight whitespace-nowrap" style={{ color: "#f8fafc" }}>AI Traffic</p>
              <p className="text-[10px] leading-tight" style={{ color: "#f5a623" }}>Agency OS</p>
            </div>
          )}
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

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center rounded-lg transition-all duration-200 group relative",
                    collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
                  )}
                  style={isActive ? {
                    background: "linear-gradient(135deg, rgba(245,166,35,0.15), rgba(245,166,35,0.05))",
                    borderLeft: "2px solid #f5a623",
                    color: "#f5a623",
                  } : {
                    color: "#94a3b8",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = ""; }}
                >
                  <div className="relative flex-shrink-0">
                    <item.icon size={18} style={isActive ? { color: "#f5a623" } : {}} />
                    {item.badge && collapsed && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-bold"
                        style={{ background: "#ef4444", color: "white" }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span className="font-body text-sm font-medium flex-1 whitespace-nowrap">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                          {item.badge}
                        </span>
                      )}
                      {item.betaBadge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md tracking-wider"
                          style={{ background: "rgba(124,58,237,0.25)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.4)" }}>
                          BETA
                        </span>
                      )}
                      {item.betaBadge && (
                        <ChevronRightIcon size={12} style={{ color: "#64748b" }} />
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Support Section */}
      <div className="px-2 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {!collapsed && (
          <p className="text-[9px] font-semibold uppercase tracking-widest px-3 mb-1.5" style={{ color: "#64748b" }}>
            Suporte
          </p>
        )}
        {[
          { icon: LifeBuoy, label: "Suporte", path: "/support" },
          { icon: Info, label: "Sobre Nós", path: "/about" },
          { icon: ScrollText, label: "Termos de Uso", path: "/terms" },
        ].map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center rounded-lg transition-all duration-200 mb-0.5",
                collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
              )}
              style={isActive ? {
                background: "linear-gradient(135deg, rgba(245,166,35,0.15), rgba(245,166,35,0.05))",
                borderLeft: "2px solid #f5a623",
                color: "#f5a623",
              } : {
                color: "#64748b",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              <item.icon size={15} style={isActive ? { color: "#f5a623" } : {}} className="flex-shrink-0" />
              {!collapsed && (
                <span className="font-body text-xs font-medium whitespace-nowrap">{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Language Selector */}
      <div className={cn("px-3 pb-1 relative", collapsed ? "flex justify-center" : "")}>
        <button
          onClick={() => setLangOpen(!langOpen)}
          title="Idioma"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-body font-medium transition-all border w-full",
            collapsed ? "justify-center px-2" : "justify-between"
          )}
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: langOpen ? "rgba(245,166,35,0.5)" : "rgba(255,255,255,0.08)",
            color: "#94a3b8",
          }}
        >
          <div className="flex items-center gap-2">
            <Globe size={14} style={{ color: "#f5a623" }} />
            {!collapsed && <span>{language}</span>}
          </div>
          {!collapsed && <ChevronDown size={11} style={{ color: "#64748b", transform: langOpen ? "rotate(180deg)" : "", transition: "transform 0.2s" }} />}
        </button>

        {langOpen && !collapsed && (
          <div
            className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border overflow-hidden shadow-xl z-50"
            style={{ background: "#0d1520", borderColor: "rgba(255,255,255,0.1)" }}
          >
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => { setLanguage(lang); setLangOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-body transition-colors"
                style={{
                  color: language === lang ? "#f5a623" : "#94a3b8",
                  background: language === lang ? "rgba(245,166,35,0.08)" : "transparent",
                }}
                onMouseEnter={e => { if (language !== lang) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (language !== lang) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span>{lang}</span>
                {language === lang && <span style={{ color: "#f5a623", fontSize: "10px" }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {langOpen && collapsed && (
          <div
            className="absolute bottom-full left-full ml-2 w-20 rounded-lg border overflow-hidden shadow-xl z-50"
            style={{ background: "#0d1520", borderColor: "rgba(255,255,255,0.1)" }}
          >
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => { setLanguage(lang); setLangOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-body transition-colors"
                style={{
                  color: language === lang ? "#f5a623" : "#94a3b8",
                  background: language === lang ? "rgba(245,166,35,0.08)" : "transparent",
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Theme Toggle */}
      <div className={cn("px-3 pb-2", collapsed ? "flex justify-center" : "")}>
        <button
          onClick={toggleTheme}
          title={isLight ? "Modo Escuro" : "Modo Claro"}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-body font-medium transition-all border w-full",
            collapsed ? "justify-center px-2" : ""
          )}
          style={{
            background: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.08)",
            color: "#94a3b8",
          }}
        >
          {isLight ? <Moon size={14} style={{ color: "#f5a623" }} /> : <Sun size={14} style={{ color: "#f5a623" }} />}
          {!collapsed && <span>{isLight ? "Modo Escuro" : "Modo Claro"}</span>}
        </button>
      </div>

      {/* Bottom User */}
      <div className={cn(
        "p-3",
        collapsed ? "flex justify-center" : ""
      )}
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className={cn("flex items-center", collapsed ? "" : "gap-2")}>
          <img
            src="https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-6.jpg"
            alt="User"
            className="w-8 h-8 rounded-full flex-shrink-0"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "#f8fafc" }}>Ana Costa</p>
              <p className="text-[10px] truncate" style={{ color: "#94a3b8" }}>Agency Lead</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}